// file: /src/components/inventory/BarcodeScanner.js - Stabilized version

import {useEffect, useRef, useState, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { BarcodeScanner as MLKitBarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import FeatureGate, {UsageLimitDisplay} from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import {getApiUrl} from '@/lib/api-config';

export default function BarcodeScanner({onBarcodeDetected, onClose, isActive}) {
    const scannerRef = useRef(null);
    const videoRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [permissionState, setPermissionState] = useState('unknown');
    const [scanFeedback, setScanFeedback] = useState('');

    // Stabilized refs for better performance
    const quaggaRef = useRef(null);
    const mountedRef = useRef(true);
    const lastScanTimeRef = useRef(0);
    const scanInProgressRef = useRef(false);
    const streamRef = useRef(null);
    const initializationRef = useRef(false);

    // FIXED: Simplified detection state
    const processedCodesRef = useRef(new Set());
    const sessionIdRef = useRef(Date.now());

    // Subscription hooks
    const subscription = useSubscription();
    const [usageInfo, setUsageInfo] = useState(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);

    const loadUsageInfo = useCallback(async () => {
        try {
            setIsLoadingUsage(true);
            const response = await fetch(getApiUrl('/api/upc/usage'), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-cache'
            });

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

    // Load usage information
    useEffect(() => {
        if (isActive) {
            loadUsageInfo();
        }
    }, [isActive, loadUsageInfo]);

    // FIXED: Simplified, more reliable UPC validation
    const validateUPC = useCallback((code) => {
        const cleanCode = code.replace(/\D/g, '');

        // More permissive validation
        if (cleanCode.length < 8 || cleanCode.length > 14) {
            return { valid: false, reason: 'invalid_length' };
        }

        // Only reject obviously invalid patterns
        if (cleanCode.match(/^0+$/) || cleanCode.match(/^(.)\1{9,}$/)) {
            return { valid: false, reason: 'invalid_pattern' };
        }

        return { valid: true, cleanCode };
    }, []);

    // FIXED: Reliable feedback system
    const provideScanFeedback = useCallback((type, message) => {
        setScanFeedback(message);

        // Visual feedback
        if (scannerRef.current && mountedRef.current) {
            const color = type === 'success' ? '#10B981' :
                type === 'processing' ? '#F59E0B' : '#EF4444';

            scannerRef.current.style.backgroundColor = color;
            scannerRef.current.style.transition = 'background-color 0.2s';

            setTimeout(() => {
                if (scannerRef.current && mountedRef.current) {
                    scannerRef.current.style.backgroundColor = '';
                }
            }, 300);
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
        }, 2000);
    }, []);

    // FIXED: Simplified, stable barcode detection
    const handleBarcodeDetection = useCallback(async (result) => {
        const now = Date.now();

        // Prevent rapid duplicate processing
        if (scanInProgressRef.current || (now - lastScanTimeRef.current) < 1000) {
            return;
        }

        const code = result.codeResult.code;
        console.log(`📱 Barcode detected: "${code}"`);

        // Quick validation
        const validation = validateUPC(code);
        if (!validation.valid) {
            console.log(`❌ Invalid UPC: ${validation.reason}`);
            return;
        }

        const cleanCode = validation.cleanCode;

        // FIXED: Prevent processing same code in this session
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

        // Success feedback immediately
        provideScanFeedback('success', 'Barcode captured successfully!');

        // Stop scanning immediately
        setIsScanning(false);

        // Process the result
        setTimeout(() => {
            if (mountedRef.current) {
                onBarcodeDetected(cleanCode);
                setTimeout(() => {
                    if (onClose) onClose();
                }, 500);
            }
        }, 300);

    }, [validateUPC, onBarcodeDetected, onClose, provideScanFeedback]);

    // FIXED: Better camera permission handling
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

    // FIXED: MLKit scanning for native platforms
    const startMLKitScanning = useCallback(async () => {
        try {
            provideScanFeedback('processing', 'Opening camera scanner...');

            const { barcodes } = await MLKitBarcodeScanner.scan();

            if (barcodes && barcodes.length > 0) {
                const barcode = barcodes[0];
                const validation = validateUPC(barcode.rawValue);

                if (validation.valid) {
                    // Check if already processed
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

    // FIXED: Stable Quagga configuration
    const getQuaggaConfig = useCallback(() => {
        return {
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: scannerRef.current,
                constraints: {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    facingMode: "environment",
                    frameRate: { ideal: 20, max: 30 } // Reduced for stability
                },
                area: {
                    top: "20%",
                    right: "20%",
                    left: "20%",
                    bottom: "20%" // Back to focused area for stability
                }
            },
            decoder: {
                readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "code_128_reader",
                    "upc_reader",
                    "upc_e_reader"
                ],
                debug: {
                    showCanvas: false,
                    showPatches: false,
                    showFoundPatches: false,
                    showSkeleton: false,
                    showLabels: false,
                    showPatchLabels: false,
                    showRemainingPatchLabels: false,
                    boxFromPatches: {
                        showTransformed: false,
                        showTransformedBox: false,
                        showBB: false
                    }
                },
                multiple: false
            },
            locate: true,
            frequency: 15, // Reduced for stability
            locator: {
                patchSize: "medium", // Changed from large for stability
                halfSample: true     // Better performance
            },
            numOfWorkers: Math.min(navigator.hardwareConcurrency || 2, 2) // Limited workers
        };
    }, []);

    // FIXED: Enhanced scanner initialization with better cleanup
    useEffect(() => {
        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current || initializationRef.current) {
                return;
            }

            initializationRef.current = true;

            try {
                // Reset session
                sessionIdRef.current = Date.now();
                processedCodesRef.current = new Set();

                setError(null);
                setIsScanning(true);

                const hasPermission = await requestCameraPermission();
                if (!hasPermission) {
                    setIsLoading(false);
                    initializationRef.current = false;
                    return;
                }

                if (Capacitor.isNativePlatform()) {
                    setIsInitialized(true);
                    setIsLoading(false);
                    // Auto-start MLKit scanning
                    setTimeout(() => startMLKitScanning(), 500);
                } else {
                    // Quagga setup
                    const Quagga = (await import('quagga')).default;
                    quaggaRef.current = Quagga;

                    const config = getQuaggaConfig();

                    await new Promise((resolve, reject) => {
                        Quagga.init(config, (err) => {
                            if (err) {
                                reject(new Error(`Scanner initialization failed: ${err.message}`));
                                return;
                            }

                            // Capture video element
                            const videoElement = scannerRef.current?.querySelector('video');
                            if (videoElement) {
                                videoRef.current = videoElement;
                                if (videoElement.srcObject) {
                                    streamRef.current = videoElement.srcObject;
                                }
                            }

                            Quagga.onDetected(handleBarcodeDetection);
                            Quagga.start();

                            if (mountedRef.current) {
                                setIsInitialized(true);
                                setIsLoading(false);
                                setError(null);
                            }
                            resolve();
                        });
                    });
                }
            } catch (error) {
                console.error('Scanner setup error:', error);
                if (mountedRef.current) {
                    setError(error.message || 'Camera scanner setup failed');
                    setIsLoading(false);
                }
                initializationRef.current = false;
            }
        };

        if (isActive && mountedRef.current && scannerRef.current) {
            initializeScanner();
        }
    }, [isActive, isInitialized, requestCameraPermission, handleBarcodeDetection, getQuaggaConfig, startMLKitScanning]);

    // FIXED: Comprehensive cleanup
    const cleanupScanner = useCallback(() => {
        console.log('🧹 Starting scanner cleanup...');

        // Stop and clean up video stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Clean up Quagga
        if (quaggaRef.current) {
            try {
                quaggaRef.current.stop();
                quaggaRef.current = null;
            } catch (error) {
                console.log('Quagga cleanup error:', error);
            }
        }

        // Clean up DOM
        if (scannerRef.current) {
            scannerRef.current.innerHTML = '';
        }

        // Reset all state
        videoRef.current = null;
        setIsInitialized(false);
        setIsScanning(false);
        setIsLoading(true);
        setError(null);
        setPermissionState('unknown');
        setScanFeedback('');

        // Reset refs
        scanInProgressRef.current = false;
        lastScanTimeRef.current = 0;
        initializationRef.current = false;

        // Clear session data
        processedCodesRef.current = new Set();
        sessionIdRef.current = Date.now();

        console.log('✅ Scanner cleanup completed');
    }, []);

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
                            <h3 className="text-lg font-medium">📷 Barcode Scanner</h3>
                            <div className="text-sm text-gray-300 mt-1">
                                {scanFeedback || 'Position barcode in camera view'}
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
                            onClick={() => {
                                cleanupScanner();
                                onClose();
                            }}
                            className="text-white text-2xl font-bold w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>

                    {/* Error Display */}
                    {error ? (
                        <div className="flex-1 flex items-center justify-center p-4">
                            <div className="bg-white rounded-lg p-6 text-center max-w-sm mx-auto">
                                <div className="text-red-600 mb-4 text-2xl">❌</div>
                                <div className="text-red-600 font-medium mb-4">{error}</div>
                                <TouchEnhancedButton
                                    onClick={() => {
                                        cleanupScanner();
                                        onClose();
                                    }}
                                    className="bg-red-600 text-white px-4 py-2 rounded-md"
                                >
                                    Close Scanner
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    ) : (
                        <>
                        {/* Loading State */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
                                <div className="text-center text-white">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                    <div className="text-lg">
                                        {permissionState === 'requesting' ? 'Requesting camera permission...' : 'Starting scanner...'}
                                    </div>
                                </div>
                            </div>
                        )}

                            {/* Scanner Interface */}
                            {Capacitor.isNativePlatform() ? (
                                // Native: Show ready-to-scan interface
                                <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                                    <div className="text-center text-white px-6">
                                        <div className="mb-8">
                                            <div className="w-32 h-32 mx-auto mb-6 border-4 border-white rounded-2xl flex items-center justify-center">
                                                <span className="text-6xl">📷</span>
                                            </div>
                                            <h2 className="text-2xl font-bold mb-2">Scanner Ready</h2>
                                            <p className="text-gray-300 text-lg">
                                                Reliable barcode scanning with enhanced stability
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
                                // Web: Standard camera view
                                <div className="flex-1 relative bg-black overflow-hidden">
                                    <div
                                        ref={scannerRef}
                                        className="absolute inset-0 w-full h-full bg-black"
                                        style={{ minHeight: '100%', minWidth: '100%' }}
                                    />

                                    {/* Standard Scanner Overlay */}
                                    {!isLoading && (
                                        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="relative w-80 h-48 border-2 border-transparent">
                                                    {/* Corner brackets */}
                                                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-green-400"></div>
                                                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-green-400"></div>
                                                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-green-400"></div>
                                                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-green-400"></div>

                                                    {/* Scanning line */}
                                                    {isScanning && (
                                                        <div
                                                            className="absolute inset-x-4 h-1 bg-green-400 opacity-90 shadow-lg"
                                                            style={{
                                                                animation: 'scanline 2s ease-in-out infinite',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)'
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Instruction overlay */}
                                            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg">
                                                <div className="text-center">
                                                    <div className="text-lg font-medium mb-2">
                                                        {scanFeedback || (isScanning ? 'Position barcode in green frame' : 'Processing...')}
                                                    </div>
                                                    <div className="text-sm opacity-75">
                                                        Stable scanning • Enhanced reliability • Better accuracy
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
                                    onClick={() => {
                                        cleanupScanner();
                                        onClose();
                                    }}
                                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg text-lg font-medium"
                                >
                                    {isScanning ? 'Cancel Scan' : 'Close'}
                                </TouchEnhancedButton>
                            </div>
                        </>
                    )}

                    {/* CSS animations */}
                    <style jsx>{`
                        @keyframes scanline {
                            0% {
                                top: 10%;
                                opacity: 1;
                                box-shadow: 0 0 10px #10B981;
                            }
                            50% {
                                opacity: 0.8;
                                box-shadow: 0 0 15px #10B981;
                            }
                            100% {
                                top: 90%;
                                opacity: 1;
                                box-shadow: 0 0 10px #10B981;
                            }
                        }
                    `}</style>
                </div>
            ) : (
                // Desktop version
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4 max-h-screen overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">📷 Barcode Scanner</h3>
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
                                onClick={() => {
                                    cleanupScanner();
                                    onClose();
                                }}
                                className="text-gray-600 hover:text-gray-800 text-2xl font-bold"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        {error ? (
                            <div className="text-center py-8">
                                <div className="text-red-600 mb-4 text-2xl">❌</div>
                                <div className="text-red-600 font-medium mb-4">{error}</div>
                                <TouchEnhancedButton
                                    onClick={() => {
                                        cleanupScanner();
                                        onClose();
                                    }}
                                    className="bg-red-600 text-white px-4 py-2 rounded-md"
                                >
                                    Close Scanner
                                </TouchEnhancedButton>
                            </div>
                        ) : (
                            <>
                                {isLoading && (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                        <div className="text-gray-600">Starting scanner...</div>
                                    </div>
                                )}

                                <div className="relative">
                                    <div
                                        ref={scannerRef}
                                        className="w-full h-80 bg-gray-200 rounded-lg overflow-hidden"
                                        style={{ display: isLoading ? 'none' : 'block' }}
                                    />

                                    {!isLoading && (
                                        <>
                                            <div className="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none">
                                                <div className="absolute inset-8 border-2 border-green-500 rounded-lg">
                                                    {isScanning && (
                                                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-green-500 animate-pulse shadow-lg"></div>
                                                    )}
                                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-500"></div>
                                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-500"></div>
                                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-500"></div>
                                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-500"></div>
                                                </div>
                                            </div>

                                            <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-sm p-3 rounded">
                                                <div className="text-center">
                                                    <div className="font-medium">
                                                        {scanFeedback || (isScanning ? 'Position barcode in green frame' : 'Processing...')}
                                                    </div>
                                                    <div className="text-xs opacity-75 mt-1">
                                                        Stable scanning • Enhanced reliability • Better accuracy
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {!isLoading && (
                                    <div className="mt-4 text-center">
                                        <TouchEnhancedButton
                                            onClick={() => {
                                                cleanupScanner();
                                                onClose();
                                            }}
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