// file: /src/components/inventory/BarcodeScanner.js v13 - FIXED scanner issues

import {useEffect, useRef, useState, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { BarcodeScanner as MLKitBarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import FeatureGate, {UsageLimitDisplay} from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import {getApiUrl} from '@/lib/api-config';

export default function BarcodeScanner({onBarcodeDetected, onClose, isActive}) {
    const scannerRef = useRef(null);
    const videoRef = useRef(null); // ADDED: Video element reference
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [permissionState, setPermissionState] = useState('unknown');
    const [manualScanMode, setManualScanMode] = useState(false);
    const [scanButtonReady, setScanButtonReady] = useState(false);

    // FIXED: Better ref management
    const cooldownRef = useRef(false);
    const quaggaRef = useRef(null);
    const mountedRef = useRef(true);
    const detectionHandlerRef = useRef(null);
    const scanCountRef = useRef(0);
    const lastValidCodeRef = useRef(null);
    const detectionHistoryRef = useRef([]);
    const initializationRef = useRef(false); // ADDED: Prevent multiple inits
    const streamRef = useRef(null); // ADDED: Track video stream

    // Subscription hooks
    const subscription = useSubscription();
    const upcScanGate = useFeatureGate(FEATURE_GATES.UPC_SCANNING, subscription.usage?.monthlyUPCScans);

    // Usage state
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
            console.log('📊 Loading UPC usage information for scanner...');

            const response = await fetch(getApiUrl('/api/upc/usage'), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                cache: 'no-cache'
            });

            if (response.ok) {
                const data = await response.json();
                setUsageInfo(data);
                console.log('📊 Scanner usage loaded:', {
                    remaining: data.remaining,
                    used: data.currentMonth,
                    limit: data.monthlyLimit,
                    canScan: data.canScan
                });
            } else {
                console.error('Failed to load UPC usage in scanner:', response.status);
            }
        } catch (error) {
            console.error('Failed to load UPC usage info in scanner:', error);
        } finally {
            setIsLoadingUsage(false);
        }
    }, []); // Empty dependency array since it doesn't depend on any props or state


    // ENHANCED: Permission request function with better error handling
    const requestCameraPermission = useCallback(async () => {
        console.log('🔐 Requesting camera permission...');
        setPermissionState('requesting');

        if (Capacitor.isNativePlatform()) {
            try {
                console.log('📱 Native platform detected, using MLKit barcode scanner...');

                // Use MLKit barcode scanner permissions
                const { camera } = await MLKitBarcodeScanner.requestPermissions();

                console.log('📋 MLKit permission result:', camera);

                if (camera === 'granted' || camera === 'limited') {
                    console.log('✅ Camera permission granted');
                    setPermissionState('granted');
                    return true;
                } else {
                    console.log('❌ Camera permission denied');
                    setPermissionState('denied');
                    setError('Camera permission denied. Please enable camera access in your device settings.');
                    return false;
                }

            } catch (error) {
                console.error('❌ Camera permission error:', error);
                setPermissionState('denied');
                setError(`Camera permission failed: ${error.message}`);
                return false;
            }
        } else {
            // Web platform - use getUserMedia (keep existing web logic)
            try {
                console.log('🌐 Web platform: testing getUserMedia...');
                const testStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                });

                console.log('✅ Web camera access granted');
                testStream.getTracks().forEach(track => track.stop());
                setPermissionState('granted');
                return true;

            } catch (error) {
                console.error('❌ Web camera access denied:', error);
                setPermissionState('denied');
                setError('Camera access denied. Please allow camera access and try again.');
                return false;
            }
        }
    }, []);


    // Detect mobile device and orientation
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isSmallScreen = window.innerWidth <= 768;
            setIsMobile(isMobileDevice || isSmallScreen);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        window.addEventListener('orientationchange', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('orientationchange', checkMobile);
        };
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Enhanced UPC validation function
    const validateUPC = useCallback((code) => {
        console.log(`🔍 Validating UPC: "${code}"`);

        const cleanCode = code.replace(/\D/g, '');
        console.log(`🧹 Cleaned code: "${cleanCode}" (length: ${cleanCode.length})`);

        const validLengths = [8, 12, 13, 14];
        if (!validLengths.includes(cleanCode.length)) {
            console.log(`❌ Invalid length: ${cleanCode.length}, expected one of ${validLengths.join(', ')}`);
            return {valid: false, reason: 'invalid_length'};
        }

        if (cleanCode.match(/^0+$/)) {
            console.log('❌ All zeros detected');
            return {valid: false, reason: 'all_zeros'};
        }

        if (/^(.)\1+$/.test(cleanCode)) {
            console.log('❌ All same digit detected');
            return {valid: false, reason: 'all_same'};
        }

        if (cleanCode.length >= 10) {
            const uniqueDigits = new Set(cleanCode).size;
            if (uniqueDigits < 3) {
                console.log(`❌ Insufficient digit variation: only ${uniqueDigits} unique digits`);
                return {valid: false, reason: 'insufficient_variation'};
            }
        }

        const invalidPatterns = [
            /^123456/, /^111111/, /^000000/, /^999999/, /1234567890/,
        ];

        for (const pattern of invalidPatterns) {
            if (pattern.test(cleanCode)) {
                console.log(`❌ Invalid pattern detected: ${pattern}`);
                return {valid: false, reason: 'invalid_pattern'};
            }
        }

        // UPC-A checksum validation for 12-digit codes
        if (cleanCode.length === 12) {
            const checkDigit = parseInt(cleanCode[11]);
            let sum = 0;

            for (let i = 0; i < 11; i++) {
                const digit = parseInt(cleanCode[i]);
                sum += (i % 2 === 0) ? digit : digit * 3;
            }

            const calculatedCheck = (10 - (sum % 10)) % 10;

            if (checkDigit !== calculatedCheck) {
                console.log(`❌ UPC-A checksum failed: expected ${calculatedCheck}, got ${checkDigit}`);
                return {valid: false, reason: 'checksum_failed'};
            }
        }

        // EAN-13 checksum validation for 13-digit codes
        if (cleanCode.length === 13) {
            const checkDigit = parseInt(cleanCode[12]);
            let sum = 0;

            for (let i = 0; i < 12; i++) {
                const digit = parseInt(cleanCode[i]);
                sum += (i % 2 === 0) ? digit : digit * 3;
            }

            const calculatedCheck = (10 - (sum % 10)) % 10;

            if (checkDigit !== calculatedCheck) {
                console.log(`❌ EAN-13 checksum failed: expected ${calculatedCheck}, got ${checkDigit}`);
                return {valid: false, reason: 'checksum_failed'};
            }
        }

        console.log(`✅ UPC validation passed: "${cleanCode}"`);
        return {valid: true, cleanCode};
    }, []); // Empty dependency array since it's a pure function


    // FIXED: Enhanced cleanup function with stream management
    const cleanupScanner = useCallback(() => {
        console.log('🧹 Starting comprehensive scanner cleanup...');

        // Stop and clean up video stream first
        if (streamRef.current) {
            console.log('🎥 Stopping video stream...');
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log(`📹 Stopped track: ${track.kind}`);
            });
            streamRef.current = null;
        }

        // Clean up Quagga
        if (quaggaRef.current) {
            try {
                if (detectionHandlerRef.current) {
                    console.log('🔌 Removing detection handler');
                    quaggaRef.current.offDetected(detectionHandlerRef.current);
                    detectionHandlerRef.current = null;
                }

                console.log('🛑 Stopping Quagga');
                quaggaRef.current.stop();
                quaggaRef.current = null;
            } catch (error) {
                console.log('⚠️ Error during Quagga cleanup:', error);
            }
        }

        // Clean up DOM
        if (scannerRef.current) {
            scannerRef.current.innerHTML = '';
            console.log('🧹 Cleared scanner container HTML');
        }

        // Reset video reference
        videoRef.current = null;

        // Reset all state
        setIsInitialized(false);
        setIsScanning(false);
        setIsLoading(true);
        setError(null);
        setPermissionState('unknown');
        setManualScanMode(false);
        setScanButtonReady(false);

        // Reset refs
        cooldownRef.current = false;
        scanCountRef.current = 0;
        lastValidCodeRef.current = null;
        detectionHistoryRef.current = [];
        initializationRef.current = false;

        console.log('✅ Scanner cleanup completed');
    }, []); // Empty dependency array since it only uses refs and setters


    // FIXED: Enhanced barcode detection handler
    const handleBarcodeDetectedWithImmediateUpdate = useCallback(async (barcode) => {
        console.log('Barcode scanned:', barcode);

        // Close the scanner
        setIsScanning(false);
        setManualScanMode(false);
        setScanButtonReady(false);

        // Call the parent's onBarcodeDetected function
        if (onBarcodeDetected) {
            onBarcodeDetected(barcode);
        }

        // Close the scanner modal
        setTimeout(() => {
            if (onClose) {
                onClose();
            }
        }, 500);

    }, [onBarcodeDetected, onClose]);

// Fix 4: Update the main barcode detection handler if it uses loadUsageInfo
    const handleBarcodeDetection = useCallback(async (result) => {
        console.log('🔍 Barcode detection triggered');

        if (!mountedRef.current || cooldownRef.current || !isScanning) {
            console.log('⏩ Scanner not ready, ignoring detection');
            return;
        }

        // Handle manual mode
        if (manualScanMode && !scanButtonReady) {
            console.log('⏩ Manual scan mode - waiting for scan button');
            setScanButtonReady(true);
            return;
        }

        const code = result.codeResult.code;
        const format = result.codeResult.format;
        scanCountRef.current += 1;

        console.log(`📱 Raw barcode detected: "${code}" (format: ${format}, scan #${scanCountRef.current})`);

        // Quality check
        if (result.codeResult.decodedCodes && result.codeResult.decodedCodes.length > 0) {
            const avgError = result.codeResult.decodedCodes.reduce((sum, code) => sum + (code.error || 0), 0) / result.codeResult.decodedCodes.length;
            console.log(`📊 Average decode error: ${avgError.toFixed(3)}`);

            if (avgError > 0.15) {
                console.log(`❌ High error rate rejected: ${avgError.toFixed(3)} > 0.15`);
                return;
            }
        }

        const validation = validateUPC(code);
        if (!validation.valid) {
            console.log(`❌ UPC validation failed: ${validation.reason}`);
            return;
        }

        const cleanCode = validation.cleanCode;

        // Duplicate detection
        const now = Date.now();
        detectionHistoryRef.current = detectionHistoryRef.current.filter(entry => now - entry.timestamp < 5000);

        const recentDetection = detectionHistoryRef.current.find(entry => entry.code === cleanCode);
        if (recentDetection) {
            console.log(`⏩ Duplicate detection ignored: "${cleanCode}" was detected ${now - recentDetection.timestamp}ms ago`);
            return;
        }

        detectionHistoryRef.current.push({code: cleanCode, timestamp: now});

        if (lastValidCodeRef.current === cleanCode) {
            console.log(`⏩ Same code as last detection, ignoring: "${cleanCode}"`);
            return;
        }

        console.log(`✅ Valid UPC accepted: "${cleanCode}"`);
        lastValidCodeRef.current = cleanCode;

        // Proper state management for successful scan
        cooldownRef.current = true;
        setIsScanning(false);
        setScanButtonReady(false);
        setManualScanMode(false);

        playBeepSound();

        // Visual feedback
        if (scannerRef.current && mountedRef.current) {
            scannerRef.current.style.backgroundColor = '#10B981';
            scannerRef.current.style.border = '4px solid #10B981';

            setTimeout(() => {
                if (scannerRef.current && mountedRef.current) {
                    scannerRef.current.style.backgroundColor = '';
                    scannerRef.current.style.border = '';
                }
            }, 500);
        }

        // Process the barcode
        setTimeout(async () => {
            if (mountedRef.current) {
                console.log(`📤 Calling onBarcodeDetected with: "${cleanCode}"`);
                onBarcodeDetected(cleanCode);
                await loadUsageInfo();

                // Reset scanner state for next scan
                setTimeout(() => {
                    if (mountedRef.current) {
                        console.log('🔄 Resetting scanner for next scan...');
                        cooldownRef.current = false;
                        setIsScanning(true);
                        lastValidCodeRef.current = null; // Allow same code to be scanned again
                    }
                }, 2000);
            }
        }, 800);

    }, [isScanning, validateUPC, onBarcodeDetected, loadUsageInfo, manualScanMode, scanButtonReady]);

    // Add a new function to handle MLKit scanning
    const startMLKitScanning = useCallback(async () => {
        try {
            console.log('🚀 Starting MLKit barcode scanning...');

            const { barcodes } = await MLKitBarcodeScanner.scan();

            if (barcodes && barcodes.length > 0) {
                const barcode = barcodes[0];
                console.log('✅ MLKit barcode detected:', barcode.rawValue);

                // Validate the barcode
                const validation = validateUPC(barcode.rawValue);
                if (validation.valid) {
                    await handleBarcodeDetectedWithImmediateUpdate(validation.cleanCode);
                } else {
                    console.log('❌ Invalid barcode from MLKit:', validation.reason);
                    alert('Invalid barcode detected. Please try scanning again.');
                }
            } else {
                console.log('❌ No barcodes found by MLKit');
                alert('No barcode detected. Please try again.');
            }

        } catch (error) {
            console.error('❌ MLKit scanning error:', error);
            if (error.message.includes('cancelled')) {
                console.log('📱 User cancelled MLKit scanning');
            } else {
                alert('Barcode scanning failed. Please try again.');
            }
        }
    }, [validateUPC, handleBarcodeDetectedWithImmediateUpdate]);

    // FIXED: Manual scan trigger function with MLKit support
    const triggerManualScan = useCallback(() => {
        console.log('🔘 Manual scan button pressed');

        if (Capacitor.isNativePlatform()) {
            // Use MLKit for native platforms
            console.log('📱 Using MLKit for native scanning');
            startMLKitScanning();
            return;
        }

        // Keep existing Quagga logic for web platforms
        if (!videoRef.current || !quaggaRef.current) {
            console.log('❌ Video or Quagga not ready for manual scan');
            alert('Scanner not ready. Please try again.');
            return;
        }

        if (videoRef.current.readyState < 2) {
            console.log('❌ Video not ready for manual scan');
            alert('Camera is still loading. Please wait a moment and try again.');
            return;
        }

        try {
            console.log('📸 Triggering manual scan...');
            setScanButtonReady(true);

            // Create a canvas to capture the current video frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;

            // Draw the current video frame
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            // Convert to data URL
            const imageData = canvas.toDataURL('image/png');

            // Use Quagga to decode the image
            const Quagga = quaggaRef.current;
            Quagga.decodeSingle({
                src: imageData,
                numOfWorkers: 0,
                inputStream: {
                    size: Math.min(canvas.width, canvas.height)
                },
                decoder: {
                    readers: [
                        "ean_reader",
                        "ean_8_reader",
                        "code_128_reader",
                        "upc_reader",
                        "upc_e_reader",
                        "code_39_reader"
                    ]
                }
            }, (result) => {
                if (result && result.codeResult) {
                    console.log('✅ Manual scan successful:', result.codeResult.code);
                    handleBarcodeDetection(result);
                } else {
                    console.log('❌ Manual scan failed - no barcode detected');
                    setScanButtonReady(false);

                    // Provide user feedback
                    if (isMobile) {
                        alert('No barcode detected. Please position the barcode clearly within the red frame and try again.');
                    } else {
                        alert('No barcode detected in the current view. Please position the barcode within the scanning area and try again.');
                    }
                }
            });

        } catch (error) {
            console.error('❌ Manual scan error:', error);
            setScanButtonReady(false);
            alert('Manual scan failed. Please try the automatic scanning mode.');
        }
    }, [startMLKitScanning, handleBarcodeDetection, isMobile]);

    // FIXED: Main scanner initialization with proper cleanup
    useEffect(() => {
        let Quagga;
        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current || initializationRef.current) {
                return;
            }

            initializationRef.current = true;

            try {
                console.log('🚀 Initializing mobile-optimized barcode scanner...');
                setError(null);
                setIsScanning(true);

                const hasPermission = await requestCameraPermission();
                if (!hasPermission) {
                    setIsLoading(false);
                    initializationRef.current = false;
                    return;
                }

                // Use MLKit for native platforms, Quagga for web
                if (Capacitor.isNativePlatform()) {
                    console.log('📱 Using MLKit barcode scanner for native platform');
                    setIsInitialized(true);
                    setIsLoading(false);

                    // For native, we'll trigger MLKit when user taps scan
                    setManualScanMode(true);
                    setScanButtonReady(true);

                } else {
                    // Keep your existing Quagga initialization for web
                    console.log('🌐 Using Quagga scanner for web platform');

                    Quagga = (await import('quagga')).default;
                    quaggaRef.current = Quagga;

                    const config = {
                        inputStream: {
                            name: "Live",
                            type: "LiveStream",
                            target: scannerRef.current,
                            constraints: {
                                width: isMobile ? {min: 320, ideal: Math.min(window.innerWidth, 1280), max: 1920} : 640,
                                height: isMobile ? {
                                    min: 240,
                                    ideal: Math.min(window.innerHeight - 200, 720),
                                    max: 1080
                                } : 480,
                                facingMode: "environment",
                                aspectRatio: isMobile ? {ideal: 16 / 9, min: 4 / 3, max: 2} : 4 / 3,
                                frameRate: {ideal: 15, max: 30}
                            },
                            area: {
                                top: "20%",
                                right: "20%",
                                left: "20%",
                                bottom: "20%"
                            },
                            singleChannel: false
                        },
                        decoder: {
                            readers: [
                                "ean_reader",
                                "ean_8_reader",
                                "code_128_reader",
                                "code_39_reader",
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
                        frequency: 10,
                        locator: {
                            patchSize: isMobile ? "large" : "medium",
                            halfSample: !isMobile
                        },
                        numOfWorkers: navigator.hardwareConcurrency ? Math.min(navigator.hardwareConcurrency, 2) : 1,
                        halfsample: false
                    };

                    console.log('🚀 Initializing Quagga scanner...');

                    await new Promise((resolve, reject) => {
                        Quagga.init(config, (err) => {
                            if (err) {
                                console.error('❌ Quagga initialization failed:', err);
                                reject(new Error(`Scanner initialization failed: ${err.message || err}`));
                                return;
                            }

                            console.log('✅ Quagga initialized successfully');

                            // FIXED: Capture video element reference
                            const videoElement = scannerRef.current?.querySelector('video');
                            if (videoElement) {
                                videoRef.current = videoElement;

                                // Store stream reference for cleanup
                                if (videoElement.srcObject) {
                                    streamRef.current = videoElement.srcObject;
                                }

                                console.log('📹 Video element captured for manual scanning');
                            } else {
                                console.warn('⚠️ Video element not found for manual scanning');
                            }

                            // Set up detection handler
                            detectionHandlerRef.current = handleBarcodeDetection;
                            Quagga.onDetected(detectionHandlerRef.current);

                            Quagga.start();
                            console.log('📡 Quagga scanner started');

                            if (mountedRef.current) {
                                setIsInitialized(true);
                                setIsLoading(false);
                                setError(null);
                            }

                            resolve();
                        });
                    });

                    console.log('🎉 Scanner fully operational');
                }

            } catch (error) {
                console.error('❌ Scanner setup error:', error);
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
    }, [isActive, isInitialized, requestCameraPermission, handleBarcodeDetection, isMobile]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('🧹 Component unmounting, cleaning up scanner...');
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

    // Wrap the entire scanner with subscription gate
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
                    {/* Mobile Header */}
                    <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium">📷 Scan Barcode</h3>
                            {!isLoadingUsage && usageInfo && (
                                <div className="text-sm text-gray-300 mt-1">
                                    {usageInfo.monthlyLimit === 'unlimited' ? (
                                        <span className="text-green-400">✨ Unlimited scans</span>
                                    ) : (
                                        <>
                                            <span className="font-medium">{usageInfo.remaining} scans remaining</span>
                                            <span className="text-gray-400 ml-2">
                                                ({usageInfo.currentMonth}/{usageInfo.monthlyLimit} used)
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <TouchEnhancedButton
                            onClick={() => {
                                console.log('🚫 Close button pressed');
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
                                <div className="text-red-600 mb-4">❌ {error}</div>

                                {permissionState === 'denied' && (
                                    <div className="text-sm text-gray-600 mb-4">
                                        <p className="mb-2">To enable camera access:</p>
                                        <ul className="text-left text-xs space-y-1">
                                            <li>• Refresh this page</li>
                                            <li>• Allow camera when prompted</li>
                                            <li>• Or check browser settings</li>
                                        </ul>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            cleanupScanner();
                                            onClose();
                                        }}
                                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-md"
                                    >
                                        Close Scanner
                                    </TouchEnhancedButton>

                                    {permissionState === 'denied' && (
                                        <TouchEnhancedButton
                                            onClick={() => {
                                                window.location.reload();
                                            }}
                                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md"
                                        >
                                            Refresh Page
                                        </TouchEnhancedButton>
                                    )}
                                </div>
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
                                            {permissionState === 'requesting' ? 'Requesting camera permission...' : 'Starting camera...'}
                                        </div>
                                        <div className="text-sm mt-2 opacity-75">
                                            Enhanced validation active
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Camera Container */}
                            <div className="flex-1 relative bg-black overflow-hidden">
                                <div
                                    ref={scannerRef}
                                    className="absolute inset-0 w-full h-full bg-black"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        zIndex: 1,
                                        minHeight: '100%',
                                        minWidth: '100%'
                                    }}
                                />

                                {/* Scanner overlay */}
                                {!isLoading && (
                                    <div className="absolute inset-0 pointer-events-none" style={{zIndex: 10}}>
                                        {/* Center scanning frame */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="relative w-64 h-64 border-2 border-transparent">
                                                {/* Corner brackets */}
                                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500"></div>
                                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500"></div>
                                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500"></div>
                                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500"></div>

                                                {/* Scanning line animation */}
                                                {isScanning && (
                                                    <div
                                                        className="absolute inset-x-4 h-1 bg-red-500 opacity-80"
                                                        style={{
                                                            animation: 'scanline 2s ease-in-out infinite',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)'
                                                        }}
                                                    ></div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Instruction overlay */}
                                        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg pointer-events-auto">
                                            <div className="text-center">
                                                {isScanning ? (
                                                    <>
                                                        <div className="text-sm font-medium mb-2">📱 Position barcode within the frame</div>
                                                        <div className="text-xs opacity-75 mb-3">
                                                            {manualScanMode ? 'Manual mode active' : 'Auto-scanning active'} • Hold steady
                                                        </div>

                                                        {/* Control buttons */}
                                                        <div className="flex justify-center space-x-2">
                                                            <TouchEnhancedButton
                                                                onClick={() => setManualScanMode(!manualScanMode)}
                                                                className={`px-3 py-1 text-xs rounded ${
                                                                    manualScanMode
                                                                        ? 'bg-blue-600 text-white'
                                                                        : 'bg-gray-600 text-white'
                                                                }`}
                                                            >
                                                                {manualScanMode ? 'Auto Mode' : 'Manual Mode'}
                                                            </TouchEnhancedButton>

                                                            {manualScanMode && (
                                                                <TouchEnhancedButton
                                                                    onClick={triggerManualScan}
                                                                    disabled={!videoRef.current}
                                                                    className={`px-4 py-1 text-xs rounded font-medium ${
                                                                        videoRef.current
                                                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                                                            : 'bg-gray-500 text-gray-300'
                                                                    }`}
                                                                >
                                                                    📸 Scan Now
                                                                </TouchEnhancedButton>
                                                            )}
                                                        </div>

                                                        {manualScanMode && (
                                                            <div className="text-xs mt-2 opacity-75">
                                                                Position barcode in frame, then tap "Scan Now"
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="text-sm font-medium mb-1">✅ Valid barcode detected!</div>
                                                        <div className="text-xs opacity-75">Processing...</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Footer */}
                            <div className="flex-shrink-0 bg-black px-4 py-3">
                                <TouchEnhancedButton
                                    onClick={() => {
                                        console.log('🚫 Cancel scan button pressed');
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
                                top: 0;
                                opacity: 1;
                            }
                            50% {
                                top: calc(50% - 2px);
                                opacity: 0.7;
                            }
                            100% {
                                top: calc(100% - 4px);
                                opacity: 1;
                            }
                        }
                    `}</style>
                </div>
            ) : (
                // Desktop version
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-screen overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">📷 Scan Barcode</h3>
                                {!isLoadingUsage && usageInfo && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        {usageInfo.monthlyLimit === 'unlimited' ? (
                                            <span className="text-green-600">✨ Unlimited scans available</span>
                                        ) : (
                                            <>
                                                <span className="font-medium">{usageInfo.remaining} scans remaining</span>
                                                <span className="text-gray-400 ml-2">
                                                    ({usageInfo.currentMonth}/{usageInfo.monthlyLimit} used)
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <TouchEnhancedButton
                                onClick={() => {
                                    console.log('🚫 Desktop close button pressed');
                                    cleanupScanner();
                                    onClose();
                                }}
                                className="text-white text-2xl font-bold w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        {error ? (
                            <div className="text-center py-8">
                                <div className="text-red-600 mb-4">❌ {error}</div>

                                {permissionState === 'denied' && (
                                    <div className="text-sm text-gray-600 mb-4">
                                        <p className="mb-2">To enable camera access:</p>
                                        <ul className="text-left text-xs space-y-1 bg-gray-50 p-3 rounded">
                                            <li>• Click the camera icon in your browser's address bar</li>
                                            <li>• Select "Allow" for camera permission</li>
                                            <li>• Refresh this page and try again</li>
                                        </ul>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            cleanupScanner();
                                            onClose();
                                        }}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                    >
                                        Close Scanner
                                    </TouchEnhancedButton>

                                    {permissionState === 'denied' && (
                                        <TouchEnhancedButton
                                            onClick={() => {
                                                window.location.reload();
                                            }}
                                            className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        >
                                            Refresh Page
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {isLoading && (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                        <div className="text-gray-600">
                                            {permissionState === 'requesting' ? 'Requesting camera permission...' : 'Starting camera...'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2">Enhanced validation enabled</div>
                                    </div>
                                )}

                                <div className="relative">
                                    <div
                                        ref={scannerRef}
                                        className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden"
                                        style={{display: isLoading ? 'none' : 'block'}}
                                    />

                                    {!isLoading && (
                                        <>
                                            <div className="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none">
                                                <div className="absolute inset-4 border-2 border-red-500 rounded-lg">
                                                    {isScanning && (
                                                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse"></div>
                                                    )}
                                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500"></div>
                                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500"></div>
                                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500"></div>
                                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500"></div>
                                                </div>
                                            </div>

                                            <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
                                                {isScanning ? (
                                                    <>
                                                        📱 Position barcode within the red frame •
                                                        {manualScanMode ? ' Manual mode active' : ' Auto-scanning'} •
                                                        ✅ Enhanced validation active
                                                    </>
                                                ) : (
                                                    <>✅ Valid barcode detected! Processing...</>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {!isLoading && (
                                    <div className="mt-4 space-y-2">
                                        {/* Desktop manual scan controls */}
                                        <div className="flex justify-center space-x-2">
                                            <TouchEnhancedButton
                                                onClick={() => setManualScanMode(!manualScanMode)}
                                                className={`px-3 py-1 text-xs rounded ${
                                                    manualScanMode
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-600 text-white'
                                                }`}
                                            >
                                                {manualScanMode ? 'Auto Mode' : 'Manual Mode'}
                                            </TouchEnhancedButton>

                                            {manualScanMode && (
                                                <TouchEnhancedButton
                                                    onClick={triggerManualScan}
                                                    disabled={!videoRef.current}
                                                    className={`px-3 py-1 text-xs rounded ${
                                                        videoRef.current
                                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                                            : 'bg-gray-500 text-gray-300'
                                                    }`}
                                                >
                                                    📸 Scan Now
                                                </TouchEnhancedButton>
                                            )}
                                        </div>

                                        {/* Close button */}
                                        <div className="text-center">
                                            <TouchEnhancedButton
                                                onClick={() => {
                                                    console.log('🚫 Desktop cancel button pressed');
                                                    cleanupScanner();
                                                    onClose();
                                                }}
                                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                                            >
                                                {isScanning ? 'Cancel Scan' : 'Close'}
                                            </TouchEnhancedButton>
                                        </div>
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