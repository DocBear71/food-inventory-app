// file: /src/components/inventory/BarcodeScanner.js v15 - ZXing-js Version

import {useEffect, useRef, useState, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { BarcodeScanner as MLKitBarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import FeatureGate, {UsageLimitDisplay} from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import { apiGet } from '@/lib/api-config';

export default function BarcodeScanner({onBarcodeDetected, onClose, isActive}) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const scannerContainerRef = useRef(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [permissionState, setPermissionState] = useState('unknown');
    const [scanFeedback, setScanFeedback] = useState('');

    // ZXing and state management refs
    const codeReaderRef = useRef(null);
    const streamRef = useRef(null);
    const mountedRef = useRef(true);
    const scanInProgressRef = useRef(false);
    const lastScanTimeRef = useRef(0);
    const animationFrameRef = useRef(null);

    // Session management
    const processedCodesRef = useRef(new Set());
    const sessionIdRef = useRef(Date.now());

    // Subscription hooks
    const subscription = useSubscription();
    const [usageInfo, setUsageInfo] = useState(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);

    // Load usage information
    useEffect(() => {
        if (isActive) {
            loadUsageInfo();
        }
    }, [isActive]);

    const loadUsageInfo = useCallback(async () => {
        try {
            setIsLoadingUsage(true);
            const response = await apiGet('/api/upc/usage');

            if (response.ok) {
                const data = await response.json();
                setUsageInfo(data);
            }
        } catch (error) {
            console.error('Failed to load UPC usage info:', error);
        } finally {
            setIsLoadingUsage(false);
        }
    }, []);

    // Enhanced UPC validation with leading zero padding
    const validateUPC = useCallback((code) => {
        let cleanCode = code.replace(/\D/g, '');

        if (cleanCode.length < 6 || cleanCode.length > 14) {
            return { valid: false, reason: 'invalid_length' };
        }

        // Auto-pad common UPC lengths
        if (cleanCode.length === 11) {
            cleanCode = '0' + cleanCode;
            console.log(`🔧 Padded 11-digit code to UPC-A: ${cleanCode}`);
        } else if (cleanCode.length >= 6 && cleanCode.length <= 10) {
            cleanCode = cleanCode.padStart(12, '0');
            console.log(`🔧 Padded ${code} to standard UPC: ${cleanCode}`);
        }

        // Only reject obviously invalid patterns
        if (cleanCode.match(/^0+$/) || cleanCode.match(/^(.)\1{9,}$/)) {
            return { valid: false, reason: 'invalid_pattern' };
        }

        return { valid: true, cleanCode };
    }, []);

    // Visual and audio feedback
    const provideScanFeedback = useCallback((type, message) => {
        setScanFeedback(message);

        // Visual feedback
        if (scannerContainerRef.current && mountedRef.current) {
            const color = type === 'success' ? '#10B981' :
                type === 'processing' ? '#F59E0B' : '#EF4444';

            scannerContainerRef.current.style.backgroundColor = color;
            scannerContainerRef.current.style.transition = 'background-color 0.3s';

            setTimeout(() => {
                if (scannerContainerRef.current && mountedRef.current) {
                    scannerContainerRef.current.style.backgroundColor = '';
                }
            }, 500);
        }

        // Audio feedback for success
        if (type === 'success') {
            playBeepSound();
        }

        // Clear feedback after delay
        setTimeout(() => {
            if (mountedRef.current) {
                setScanFeedback('');
            }
        }, 3000);
    }, []);

    // Handle successful barcode detection
    const handleBarcodeDetection = useCallback(async (code) => {
        const now = Date.now();

        // Prevent rapid duplicate processing
        if (scanInProgressRef.current || (now - lastScanTimeRef.current) < 1500) {
            return;
        }

        console.log(`📱 ZXing barcode detected: "${code}"`);

        // Validate the code
        const validation = validateUPC(code);
        if (!validation.valid) {
            console.log(`❌ Invalid UPC: ${validation.reason}`);
            return;
        }

        const cleanCode = validation.cleanCode;

        // Prevent processing same code in this session
        const sessionKey = `${sessionIdRef.current}-${cleanCode}`;
        if (processedCodesRef.current.has(sessionKey)) {
            console.log(`⏩ Already processed "${cleanCode}" in this session`);
            return;
        }

        // Mark as processed immediately
        processedCodesRef.current.add(sessionKey);
        scanInProgressRef.current = true;
        lastScanTimeRef.current = now;

        console.log(`✅ Processing UPC: "${cleanCode}"`);

        // Stop scanning and provide feedback
        setIsScanning(false);
        provideScanFeedback('success', 'Barcode captured successfully!');

        // Process the result
        setTimeout(() => {
            if (mountedRef.current) {
                onBarcodeDetected(cleanCode);
                setTimeout(() => {
                    if (mountedRef.current && onClose) {
                        onClose();
                    }
                }, 500);
            }
        }, 300);

    }, [validateUPC, onBarcodeDetected, onClose, provideScanFeedback]);

    // Camera permission handling
    const requestCameraPermission = useCallback(async () => {
        setPermissionState('requesting');

        if (Capacitor.isNativePlatform()) {
            try {
                const { camera } = await MLKitBarcodeScanner.requestPermissions();
                if (camera === 'granted' || camera === 'limited') {
                    setPermissionState('granted');
                    return true;
                } else {
                    setPermissionState('denied');
                    setError('Camera permission denied. Please enable camera access in settings.');
                    return false;
                }
            } catch (error) {
                setPermissionState('denied');
                setError(`Camera permission failed: ${error.message}`);
                return false;
            }
        } else {
            try {
                // Test camera access
                const testStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment",
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 }
                    }
                });
                testStream.getTracks().forEach(track => track.stop());
                setPermissionState('granted');
                return true;
            } catch (error) {
                setPermissionState('denied');
                setError('Camera access denied. Please allow camera access and try again.');
                return false;
            }
        }
    }, []);

    // MLKit scanning for native platforms
    const startMLKitScanning = useCallback(async () => {
        try {
            provideScanFeedback('processing', 'Opening camera scanner...');

            const { barcodes } = await MLKitBarcodeScanner.scan();

            if (barcodes && barcodes.length > 0) {
                const barcode = barcodes[0];
                const validation = validateUPC(barcode.rawValue);

                if (validation.valid) {
                    const sessionKey = `${sessionIdRef.current}-${validation.cleanCode}`;
                    if (!processedCodesRef.current.has(sessionKey)) {
                        processedCodesRef.current.add(sessionKey);
                        provideScanFeedback('success', 'Barcode scanned successfully!');
                        setTimeout(() => {
                            onBarcodeDetected(validation.cleanCode);
                            setTimeout(() => onClose(), 500);
                        }, 300);
                    } else {
                        provideScanFeedback('error', 'Barcode already processed');
                    }
                } else {
                    provideScanFeedback('error', 'Invalid barcode detected');
                }
            } else {
                provideScanFeedback('error', 'No barcode detected');
            }
        } catch (error) {
            if (!error.message.includes('cancelled')) {
                provideScanFeedback('error', 'Scanning failed');
            }
        }
    }, [validateUPC, onBarcodeDetected, onClose, provideScanFeedback]);

    // ENHANCED: Error handling with automatic recovery
    const handleScanError = useCallback((error) => {
        console.error('🚨 Scanner error:', error);

        // Don't show technical errors to users, just provide recovery options
        if (error.message.includes('Permission') || error.message.includes('permission')) {
            setError('Camera permission required. Please allow camera access and try again.');
        } else if (error.message.includes('NotFoundError') || error.message.includes('no camera')) {
            setError('No camera found. Please ensure your device has a camera.');
        } else if (error.message.includes('NotReadableError')) {
            setError('Camera is in use by another application. Please close other camera apps and try again.');
        } else {
            setError('Scanner initialization failed. Please try again.');
        }

        // Reset scanner state to allow retry
        setIsInitialized(false);
        setIsLoading(false);
        setIsScanning(false);
    }, []);

    // ENHANCED: Update the scanner initialization with better error handling
    const initializeZXingScanner = useCallback(async () => {
        try {
            console.log('🚀 Initializing ZXing scanner...');

            // Dynamic import ZXing
            const { BrowserMultiFormatReader } = await import('@zxing/library');

            const codeReader = new BrowserMultiFormatReader();
            codeReaderRef.current = codeReader;

            // Get available video devices with error handling
            let videoInputDevices;
            try {
                videoInputDevices = await codeReader.listVideoInputDevices();
                console.log('📹 Available cameras:', videoInputDevices.length);
            } catch (deviceError) {
                throw new Error('Unable to access camera devices. Please check camera permissions.');
            }

            if (!videoInputDevices || videoInputDevices.length === 0) {
                throw new Error('No camera devices found on this device.');
            }

            // Find back camera or use first available
            const selectedDeviceId = videoInputDevices.find(device =>
                device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('environment')
            )?.deviceId || videoInputDevices[0]?.deviceId;

            console.log('📷 Using camera:', selectedDeviceId);

            // Start decoding with enhanced error handling
            try {
                const stream = await codeReader.decodeFromVideoDevice(
                    selectedDeviceId,
                    videoRef.current,
                    (result, error) => {
                        if (result) {
                            const code = result.getText();
                            console.log('📱 ZXing detected:', code);
                            handleBarcodeDetection(code);
                        }
                        // Log errors for debugging but don't show to user
                        if (error && !error.message.includes('No MultiFormat Readers')) {
                            console.log('ZXing scan attempt:', error.message);
                        }
                    }
                );

                streamRef.current = stream;
                console.log('✅ ZXing scanner started successfully');

            } catch (streamError) {
                console.error('Stream error:', streamError);
                throw new Error('Failed to start camera stream. Camera may be in use by another application.');
            }

        } catch (error) {
            console.error('❌ ZXing initialization error:', error);
            handleScanError(error);
            throw error;
        }
    }, [handleBarcodeDetection, handleScanError]);

    // Main scanner initialization
    useEffect(() => {
        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current) {
                return;
            }

            try {
                // Reset session
                sessionIdRef.current = Date.now();
                processedCodesRef.current = new Set();

                setError(null);
                setIsScanning(true);
                setScanFeedback('');

                console.log(`🚀 Starting new scanner session: ${sessionIdRef.current}`);

                const hasPermission = await requestCameraPermission();
                if (!hasPermission) {
                    setIsLoading(false);
                    return;
                }

                if (Capacitor.isNativePlatform()) {
                    console.log('📱 Native platform - using MLKit');
                    setIsInitialized(true);
                    setIsLoading(false);
                    setTimeout(() => startMLKitScanning(), 800);
                } else {
                    console.log('🌐 Web platform - using ZXing');
                    await initializeZXingScanner();

                    if (mountedRef.current) {
                        setIsInitialized(true);
                        setIsLoading(false);
                        setError(null);
                    }
                }
            } catch (error) {
                console.error('❌ Scanner setup error:', error);
                if (mountedRef.current) {
                    setError(`Scanner initialization failed: ${error.message}`);
                    setIsLoading(false);
                }
            }
        };

        if (isActive && mountedRef.current) {
            initializeScanner();
        }
    }, [isActive, isInitialized, requestCameraPermission, startMLKitScanning, initializeZXingScanner]);

    // Cleanup function
    const cleanupScanner = useCallback(async () => {
        console.log('🧹 Cleaning up ZXing scanner...');

        // Stop scanning
        setIsScanning(false);
        scanInProgressRef.current = false;

        // Cancel animation frames
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        // Stop ZXing code reader
        if (codeReaderRef.current) {
            try {
                await codeReaderRef.current.reset();
                console.log('✅ ZXing code reader reset');
            } catch (error) {
                console.log('⚠️ ZXing cleanup error:', error.message);
            }
            codeReaderRef.current = null;
        }

        // Stop video stream
        if (streamRef.current) {
            try {
                streamRef.current.getTracks().forEach(track => track.stop());
                console.log('✅ Video stream stopped');
            } catch (error) {
                console.log('⚠️ Stream cleanup error:', error.message);
            }
            streamRef.current = null;
        }

        // Reset video element
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        // Reset state
        setIsInitialized(false);
        setIsLoading(true);
        setError(null);
        setPermissionState('unknown');
        setScanFeedback('');

        // Reset session
        processedCodesRef.current = new Set();
        sessionIdRef.current = Date.now();
        lastScanTimeRef.current = 0;

        console.log('✅ Scanner cleanup completed');
    }, []);

    // Close handler
    const handleScannerClose = useCallback(async () => {
        console.log('🚫 Scanner close requested');
        await cleanupScanner();

        setTimeout(() => {
            if (mountedRef.current && onClose) {
                onClose();
            }
        }, 200);
    }, [cleanupScanner, onClose]);

    // ENHANCED: Retry scanner initialization
    const retryScanner = useCallback(async () => {
        console.log('🔄 Retrying scanner initialization...');

        // Reset all error states
        setError(null);
        setIsLoading(true);
        setIsInitialized(false);
        setIsScanning(true);
        setScanFeedback('');

        // Reset session
        sessionIdRef.current = Date.now();
        processedCodesRef.current = new Set();

        // Force cleanup first
        await cleanupScanner();

        // Wait a moment for cleanup
        setTimeout(() => {
            if (mountedRef.current) {
                // This will trigger the useEffect to reinitialize
                setIsInitialized(false);
            }
        }, 500);
    }, [cleanupScanner]);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice || window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            cleanupScanner();
        };
    }, [cleanupScanner]);

    // Audio feedback
    const playBeepSound = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Audio feedback not available');
        }
    };

    if (!isActive) return null;

    return (
        <FeatureGate
            feature={FEATURE_GATES.UPC_SCANNING}
            currentCount={subscription.usage?.monthlyUPCScans || 0}
            fallback={
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                UPC Scanning Limit Reached
                            </h3>
                            <p className="text-gray-600 mb-4">
                                You've used all your UPC scans for this month.
                            </p>
                            <div className="text-sm text-gray-500 mb-4">
                                <UsageLimitDisplay
                                    feature={FEATURE_GATES.UPC_SCANNING}
                                    label="Remaining scans"
                                />
                            </div>
                            <div className="space-y-3">
                                <TouchEnhancedButton
                                    onClick={() => window.location.href = '/pricing?source=upc-limit'}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium"
                                >
                                    Upgrade for Unlimited Scans
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={onClose}
                                    className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md"
                                >
                                    Close Scanner
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            {isMobile ? (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    {/* Header */}
                    <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium">📷 Enhanced Scanner</h3>
                            <div className="text-sm text-gray-300 mt-1">
                                {scanFeedback || 'Point camera at barcode'}
                            </div>
                            {!isLoadingUsage && usageInfo && (
                                <div className="text-xs text-gray-400 mt-1">
                                    {usageInfo.monthlyLimit === 'unlimited' ? (
                                        '✨ Unlimited scans'
                                    ) : (
                                        `${usageInfo.remaining} scans remaining`
                                    )}
                                </div>
                            )}
                        </div>
                        <TouchEnhancedButton
                            onClick={handleScannerClose}
                            className="text-white text-2xl font-bold w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>

                    {/* Mobile Error Display */}
                    {error ? (
                        <div className="flex-1 flex items-center justify-center p-4">
                            <div className="bg-white rounded-lg p-6 text-center max-w-sm mx-auto">
                                <div className="text-red-600 mb-4 text-2xl">📷</div>
                                <div className="text-red-600 font-medium mb-4">{error}</div>
                                <div className="space-y-3">
                                    <TouchEnhancedButton
                                        onClick={retryScanner}
                                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
                                    >
                                        Try Again
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={handleScannerClose}
                                        className="w-full bg-gray-600 text-white px-4 py-2 rounded-md"
                                    >
                                        Close Scanner
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Loading State */}
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black z-30 zxing-scanner-loading">
                                <div className="text-center text-white">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                        <div className="text-lg">
                                            {permissionState === 'requesting' ? 'Requesting camera permission...' : 'Starting enhanced scanner...'}
                                        </div>
                                        <div className="text-sm mt-2 opacity-75">
                                            Powered by ZXing
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Scanner Interface */}
                            {Capacitor.isNativePlatform() ? (
                                // Native: MLKit interface
                                <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                                    <div className="text-center text-white px-6">
                                        <div className="mb-8">
                                            <div className="w-32 h-32 mx-auto mb-6 border-4 border-white rounded-2xl flex items-center justify-center">
                                                <span className="text-6xl">📷</span>
                                            </div>
                                            <h2 className="text-2xl font-bold mb-2">MLKit Scanner Ready</h2>
                                            <p className="text-gray-300 text-lg">
                                                Professional barcode scanning with MLKit
                                            </p>
                                        </div>

                                        {!isLoading && (
                                            <TouchEnhancedButton
                                                onClick={startMLKitScanning}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg"
                                            >
                                                📸 Start Scanning
                                            </TouchEnhancedButton>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Web: ZXing interface
                                <div className="flex-1 relative bg-black overflow-hidden zxing-scanner-container" ref={scannerContainerRef}>
                                    <video
                                        ref={videoRef}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        autoPlay
                                        playsInline
                                        muted
                                    />

                                    {/* ZXing Scanner Overlay */}
                                    {!isLoading && (
                                        <div className="absolute inset-0 pointer-events-none zxing-scanner-overlay" style={{ zIndex: 10 }}>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="relative w-80 h-48 border-2 border-transparent">
                                                    {/* FORCED WHITE corner brackets with !important styles */}
                                                    <div
                                                        className="absolute top-0 left-0 w-12 h-12 rounded-tl-lg"
                                                        style={{
                                                            borderTop: '4px solid #ffffff',
                                                            borderLeft: '4px solid #ffffff',
                                                            boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
                                                        }}
                                                    ></div>
                                                    <div
                                                        className="absolute top-0 right-0 w-12 h-12 rounded-tr-lg"
                                                        style={{
                                                            borderTop: '4px solid #ffffff',
                                                            borderRight: '4px solid #ffffff',
                                                            boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
                                                        }}
                                                    ></div>
                                                    <div
                                                        className="absolute bottom-0 left-0 w-12 h-12 rounded-bl-lg"
                                                        style={{
                                                            borderBottom: '4px solid #ffffff',
                                                            borderLeft: '4px solid #ffffff',
                                                            boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
                                                        }}
                                                    ></div>
                                                    <div
                                                        className="absolute bottom-0 right-0 w-12 h-12 rounded-br-lg"
                                                        style={{
                                                            borderBottom: '4px solid #ffffff',
                                                            borderRight: '4px solid #ffffff',
                                                            boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
                                                        }}
                                                    ></div>

                                                    {/* BRIGHT white scanning indicator */}
                                                    {isScanning && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div
                                                                className="w-4 h-4 rounded-full animate-ping"
                                                                style={{
                                                                    backgroundColor: '#ffffff',
                                                                    boxShadow: '0 0 15px rgba(255, 255, 255, 1)'
                                                                }}
                                                            ></div>
                                                        </div>
                                                    )}

                                                    {/* BRIGHT scanning line animation */}
                                                    {isScanning && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                left: '16px',
                                                                right: '16px',
                                                                height: '4px',
                                                                backgroundColor: '#ffffff',
                                                                opacity: 0.9,
                                                                boxShadow: '0 0 15px rgba(255, 255, 255, 0.8)',
                                                                animation: 'scanline 2s ease-in-out infinite',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)'
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Enhanced instruction overlay */}
                                            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg border border-white border-opacity-30">
                                                <div className="text-center">
                                                    <div className="text-lg font-medium mb-2">
                                                        {scanFeedback || (isScanning ? 'Position barcode in white frame' : 'Processing...')}
                                                    </div>
                                                    <div className="text-sm opacity-75">
                                                        ZXing scanner • Enhanced accuracy • Auto-detection
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                            {/* Footer */}
                            <div className="flex-shrink-0 bg-black px-4 py-3">
                                <TouchEnhancedButton
                                    onClick={handleScannerClose}
                                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg text-lg font-medium"
                                >
                                    {isScanning ? 'Cancel Scan' : 'Close'}
                                </TouchEnhancedButton>
                            </div>
                        </>
                    )}
                </div>
            ) : (

                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4 max-h-screen overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">📷 Enhanced Scanner</h3>
                                <div className="text-xs text-gray-500 mt-1">Powered by ZXing</div>
                                {!isLoadingUsage && usageInfo && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        {usageInfo.monthlyLimit === 'unlimited' ? (
                                            '✨ Unlimited scans available'
                                        ) : (
                                            `${usageInfo.remaining} scans remaining`
                                        )}
                                    </div>
                                )}
                            </div>
                            <TouchEnhancedButton
                                onClick={handleScannerClose}
                                className="text-gray-600 hover:text-gray-800 text-2xl font-bold"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>
                        {/* Desktop Error Display */}
                        {error ? (
                            <div className="text-center py-8">
                                <div className="text-red-600 mb-4 text-2xl">📷</div>
                                <div className="text-red-600 font-medium mb-4">{error}</div>
                                <div className="space-y-2">
                                    <TouchEnhancedButton
                                        onClick={retryScanner}
                                        className="mr-2 bg-blue-600 text-white px-4 py-2 rounded-md"
                                    >
                                        Try Again
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={handleScannerClose}
                                        className="bg-gray-600 text-white px-4 py-2 rounded-md"
                                    >
                                        Close Scanner
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        ) : (
                            <>
                                {isLoading && (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                        <div className="text-gray-600">Starting ZXing scanner...</div>
                                    </div>
                                )}

                                <div className="relative zxing-scanner-container">
                                    <video
                                        ref={videoRef}
                                        className="w-full h-80 bg-gray-200 rounded-lg object-cover"
                                        style={{ display: isLoading ? 'none' : 'block' }}
                                        autoPlay
                                        playsInline
                                        muted
                                    />
                                    {/* Desktop Version - replace desktop overlay section */}
                                    {!isLoading && (
                                        <>
                                            <div className="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none">
                                                <div className="absolute inset-8 rounded-lg" style={{ border: '2px solid #ffffff', boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)' }}>
                                                    {isScanning && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div
                                                                className="w-3 h-3 rounded-full animate-ping"
                                                                style={{
                                                                    backgroundColor: '#ffffff',
                                                                    boxShadow: '0 0 10px rgba(255, 255, 255, 1)'
                                                                }}
                                                            ></div>
                                                        </div>
                                                    )}
                                                    <div
                                                        className="absolute top-0 left-0 w-6 h-6 rounded-tl"
                                                        style={{
                                                            borderTop: '2px solid #ffffff',
                                                            borderLeft: '2px solid #ffffff'
                                                        }}
                                                    ></div>
                                                    <div
                                                        className="absolute top-0 right-0 w-6 h-6 rounded-tr"
                                                        style={{
                                                            borderTop: '2px solid #ffffff',
                                                            borderRight: '2px solid #ffffff'
                                                        }}
                                                    ></div>
                                                    <div
                                                        className="absolute bottom-0 left-0 w-6 h-6 rounded-bl"
                                                        style={{
                                                            borderBottom: '2px solid #ffffff',
                                                            borderLeft: '2px solid #ffffff'
                                                        }}
                                                    ></div>
                                                    <div
                                                        className="absolute bottom-0 right-0 w-6 h-6 rounded-br"
                                                        style={{
                                                            borderBottom: '2px solid #ffffff',
                                                            borderRight: '2px solid #ffffff'
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-90 text-white text-sm p-3 rounded border border-white border-opacity-30">
                                                <div className="text-center">
                                                    <div className="font-medium">
                                                        {scanFeedback || (isScanning ? 'ZXing scanner active' : 'Processing...')}
                                                    </div>
                                                    <div className="text-xs opacity-75 mt-1">
                                                        Enhanced accuracy • Auto-detection • No positioning required
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {!isLoading && (
                                    <div className="mt-4 text-center">
                                        <TouchEnhancedButton
                                            onClick={handleScannerClose}
                                            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                                        >
                                            {isScanning ? 'Cancel Scan' : 'Close'}
                                        </TouchEnhancedButton>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </FeatureGate>
    );
}