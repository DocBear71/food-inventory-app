// file: /src/components/inventory/BarcodeScanner.js v7 - Enhanced validation and error handling for accurate UPC detection

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function BarcodeScanner({ onBarcodeDetected, onClose, isActive }) {
    const scannerRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const cooldownRef = useRef(false);
    const quaggaRef = useRef(null);
    const mountedRef = useRef(true);
    const detectionHandlerRef = useRef(null);
    const scanCountRef = useRef(0);
    const lastValidCodeRef = useRef(null);
    const detectionHistoryRef = useRef([]);

    console.log('🆕 BarcodeScanner v7 loaded - ENHANCED VALIDATION VERSION');

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

        // Clean the code - remove all non-digits
        const cleanCode = code.replace(/\D/g, '');
        console.log(`🧹 Cleaned code: "${cleanCode}" (length: ${cleanCode.length})`);

        // Check length - must be valid UPC length
        const validLengths = [8, 12, 13, 14]; // UPC-E, UPC-A, EAN-13, ITF-14
        if (!validLengths.includes(cleanCode.length)) {
            console.log(`❌ Invalid length: ${cleanCode.length}, expected one of ${validLengths.join(', ')}`);
            return { valid: false, reason: 'invalid_length' };
        }

        // Check for obviously invalid patterns
        if (cleanCode.match(/^0+$/)) {
            console.log('❌ All zeros detected');
            return { valid: false, reason: 'all_zeros' };
        }

        if (/^(.)\1+$/.test(cleanCode)) {
            console.log('❌ All same digit detected');
            return { valid: false, reason: 'all_same' };
        }

        // Check for minimum digit variation (at least 3 different digits for codes 10+ digits)
        if (cleanCode.length >= 10) {
            const uniqueDigits = new Set(cleanCode).size;
            if (uniqueDigits < 3) {
                console.log(`❌ Insufficient digit variation: only ${uniqueDigits} unique digits`);
                return { valid: false, reason: 'insufficient_variation' };
            }
        }

        // Enhanced pattern checks for common invalid sequences
        const invalidPatterns = [
            /^123456/, // Sequential start
            /^111111/, // Repeated digits
            /^000000/, // Leading zeros beyond normal
            /^999999/, // Repeated 9s
            /1234567890/, // Sequential pattern
        ];

        for (const pattern of invalidPatterns) {
            if (pattern.test(cleanCode)) {
                console.log(`❌ Invalid pattern detected: ${pattern}`);
                return { valid: false, reason: 'invalid_pattern' };
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
                return { valid: false, reason: 'checksum_failed' };
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
                return { valid: false, reason: 'checksum_failed' };
            }
        }

        console.log(`✅ UPC validation passed: "${cleanCode}"`);
        return { valid: true, cleanCode };
    }, []);

    // Enhanced cleanup function
    const cleanupScanner = useCallback(() => {
        console.log('🧹 Starting scanner cleanup...');

        if (quaggaRef.current) {
            try {
                if (detectionHandlerRef.current) {
                    console.log('Removing detection handler');
                    quaggaRef.current.offDetected(detectionHandlerRef.current);
                    detectionHandlerRef.current = null;
                }

                quaggaRef.current.offDetected();
                console.log('Stopping Quagga');
                quaggaRef.current.stop();

                // Force clear the scanner container
                if (scannerRef.current) {
                    scannerRef.current.innerHTML = '';
                    console.log('🧹 Cleared scanner container HTML');
                }

                quaggaRef.current = null;
            } catch (error) {
                console.log('Error during cleanup:', error);
            }
        }

        // Reset all state
        setIsInitialized(false);
        setIsScanning(false);
        setIsLoading(true);
        setError(null);
        cooldownRef.current = false;
        scanCountRef.current = 0;
        lastValidCodeRef.current = null;
        detectionHistoryRef.current = [];

        console.log('✅ Scanner cleanup completed');
    }, []);

    // Enhanced barcode detection handler with better validation
    const handleBarcodeDetection = useCallback((result) => {
        console.log('🔍 Barcode detection triggered');

        if (!mountedRef.current || cooldownRef.current || !isScanning) {
            console.log('⏩ Scanner not ready, ignoring detection');
            return;
        }

        const code = result.codeResult.code;
        const format = result.codeResult.format;
        scanCountRef.current += 1;

        console.log(`📱 Raw barcode detected: "${code}" (format: ${format}, scan #${scanCountRef.current})`);

        // Enhanced confidence checking
        if (result.codeResult.decodedCodes && result.codeResult.decodedCodes.length > 0) {
            const avgError = result.codeResult.decodedCodes.reduce((sum, code) => sum + (code.error || 0), 0) / result.codeResult.decodedCodes.length;
            console.log(`📊 Average decode error: ${avgError.toFixed(3)}`);

            if (avgError > 0.1) { // Stricter error threshold
                console.log(`❌ High error rate rejected: ${avgError.toFixed(3)} > 0.1`);
                return;
            }
        }

        // Validate the UPC
        const validation = validateUPC(code);
        if (!validation.valid) {
            console.log(`❌ UPC validation failed: ${validation.reason}`);
            return;
        }

        const cleanCode = validation.cleanCode;

        // Check against recent detection history to avoid duplicates
        const now = Date.now();
        detectionHistoryRef.current = detectionHistoryRef.current.filter(entry => now - entry.timestamp < 5000); // Keep last 5 seconds

        const recentDetection = detectionHistoryRef.current.find(entry => entry.code === cleanCode);
        if (recentDetection) {
            console.log(`⏩ Duplicate detection ignored: "${cleanCode}" was detected ${now - recentDetection.timestamp}ms ago`);
            return;
        }

        // Add to detection history
        detectionHistoryRef.current.push({ code: cleanCode, timestamp: now });

        // Check if this is the same as the last valid code (additional safety)
        if (lastValidCodeRef.current === cleanCode) {
            console.log(`⏩ Same code as last detection, ignoring: "${cleanCode}"`);
            return;
        }

        console.log(`✅ Valid UPC accepted: "${cleanCode}"`);
        lastValidCodeRef.current = cleanCode;

        // Set cooldown to prevent multiple rapid detections
        cooldownRef.current = true;
        setIsScanning(false);

        // Enhanced visual feedback
        playBeepSound();

        if (scannerRef.current && mountedRef.current) {
            // Flash the entire scanner area green
            scannerRef.current.style.backgroundColor = '#10B981';
            scannerRef.current.style.border = '4px solid #10B981';

            setTimeout(() => {
                if (scannerRef.current && mountedRef.current) {
                    scannerRef.current.style.backgroundColor = '';
                    scannerRef.current.style.border = '';
                }
            }, 500);
        }

        // Process result with a longer delay to ensure user sees the feedback
        setTimeout(() => {
            if (mountedRef.current) {
                console.log(`📤 Calling onBarcodeDetected with: "${cleanCode}"`);
                onBarcodeDetected(cleanCode);
            }
        }, 800); // Increased delay
    }, [isScanning, validateUPC, onBarcodeDetected]);

    // Main scanner initialization effect (unchanged from previous version)
    useEffect(() => {
        let Quagga;
        let initTimeoutId;

        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current) {
                console.log('🚫 Skipping init - not active, already initialized, or unmounted');
                return;
            }

            try {
                console.log('🚀 Initializing mobile-optimized barcode scanner...');
                setError(null);
                setIsScanning(true);
                cooldownRef.current = false;
                scanCountRef.current = 0;
                lastValidCodeRef.current = null;
                detectionHistoryRef.current = [];

                // Enhanced camera availability check
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Camera API not supported on this device or browser');
                }

                // Test camera access before initializing Quagga
                console.log('🔍 Testing camera access...');
                try {
                    const testStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: "environment" }
                    });
                    console.log('✅ Camera access test successful');

                    // Stop test stream immediately
                    testStream.getTracks().forEach(track => track.stop());
                } catch (permissionError) {
                    console.error('❌ Camera permission test failed:', permissionError);

                    let errorMessage = 'Camera access denied';
                    if (permissionError.name === 'NotAllowedError') {
                        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
                    } else if (permissionError.name === 'NotFoundError') {
                        errorMessage = 'No camera found. Please ensure your device has a camera.';
                    } else if (permissionError.name === 'NotSupportedError') {
                        errorMessage = 'Camera not supported by this browser.';
                    } else if (permissionError.name === 'NotReadableError') {
                        errorMessage = 'Camera is being used by another application.';
                    }

                    setError(errorMessage);
                    setIsLoading(false);
                    return;
                }

                console.log('📦 Loading Quagga module...');
                const QuaggaModule = await import('@ericblade/quagga2');
                Quagga = QuaggaModule.default;
                quaggaRef.current = Quagga;
                console.log('✅ Quagga module loaded successfully');

                if (!mountedRef.current) {
                    console.log('❌ Component unmounted during init');
                    return;
                }

                if (!scannerRef.current) {
                    console.log('❌ Scanner ref is null, waiting...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (!scannerRef.current) {
                        console.log('❌ Scanner ref still null after wait');
                        setError('Scanner container initialization failed');
                        setIsLoading(false);
                        return;
                    }
                    console.log('✅ Scanner ref found after wait');
                }

                // Wait for DOM element to be properly sized and ensure it's stable
                console.log('⏳ Waiting for DOM element to stabilize...');
                await new Promise(resolve => setTimeout(resolve, 300));

                // Double-check the scanner ref is still available
                if (!scannerRef.current || !mountedRef.current) {
                    console.log('❌ Scanner ref lost during DOM wait');
                    return;
                }

                console.log('📐 Scanner container dimensions:', {
                    width: scannerRef.current.offsetWidth,
                    height: scannerRef.current.offsetHeight,
                    clientWidth: scannerRef.current.clientWidth,
                    clientHeight: scannerRef.current.clientHeight,
                    parent: scannerRef.current.parentElement ? 'exists' : 'missing'
                });

                // Enhanced mobile-optimized configuration
                const baseConfig = {
                    inputStream: {
                        name: "Live",
                        type: "LiveStream",
                        target: scannerRef.current,
                        constraints: {
                            facingMode: "environment"
                        }
                    },
                    locator: {
                        patchSize: "large",
                        halfSample: false
                    },
                    numOfWorkers: 1,
                    frequency: 3, // Reduced frequency to avoid false positives
                    decoder: {
                        readers: [
                            "ean_reader",      // EAN-13, EAN-8
                            "upc_reader",      // UPC-A
                            "upc_e_reader"     // UPC-E
                        ],
                        multiple: false,
                        debug: {
                            drawBoundingBox: false,
                            showFrequency: false,
                            drawScanline: false,
                            showPattern: false
                        }
                    },
                    locate: true,
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
                    }
                };

                // Try different constraint configurations for mobile
                const mobileConfigs = [
                    // Config 1: Simple constraints (most compatible)
                    {
                        ...baseConfig,
                        inputStream: {
                            ...baseConfig.inputStream,
                            constraints: {
                                facingMode: "environment"
                            }
                        }
                    },
                    // Config 2: Basic resolution constraints
                    {
                        ...baseConfig,
                        inputStream: {
                            ...baseConfig.inputStream,
                            constraints: {
                                width: { ideal: 640 },
                                height: { ideal: 480 },
                                facingMode: "environment"
                            }
                        }
                    },
                    // Config 3: Fallback to any camera
                    {
                        ...baseConfig,
                        inputStream: {
                            ...baseConfig.inputStream,
                            constraints: {
                                video: true
                            }
                        }
                    }
                ];

                const desktopConfig = {
                    ...baseConfig,
                    inputStream: {
                        ...baseConfig.inputStream,
                        constraints: {
                            width: { min: 640, ideal: 1280, max: 1920 },
                            height: { min: 480, ideal: 720, max: 1080 },
                            facingMode: "environment",
                            aspectRatio: { min: 1, max: 2 }
                        }
                    },
                    numOfWorkers: Math.min(navigator.hardwareConcurrency || 2, 4),
                    frequency: 5
                };

                const configsToTry = isMobile ? mobileConfigs : [desktopConfig];

                console.log('📋 Will try configs for mobile:', isMobile, 'Total configs:', configsToTry.length);

                // Try configurations sequentially
                const tryConfigs = async () => {
                    for (let configIndex = 0; configIndex < configsToTry.length; configIndex++) {
                        if (!mountedRef.current) {
                            console.log('⚠️ Component unmounted during config attempts');
                            return;
                        }

                        const currentConfig = configsToTry[configIndex];
                        console.log(`🔄 Trying config ${configIndex + 1}/${configsToTry.length}:`, currentConfig.inputStream.constraints);

                        try {
                            // Wrap Quagga.init in a Promise for better control
                            await new Promise((resolve, reject) => {
                                const timeoutId = setTimeout(() => {
                                    reject(new Error('Quagga init timeout'));
                                }, 10000); // 10 second timeout

                                Quagga.init(currentConfig, (err) => {
                                    clearTimeout(timeoutId);
                                    console.log(`🔄 Quagga.init callback triggered for config ${configIndex + 1}`);

                                    if (err) {
                                        console.error(`❌ Config ${configIndex + 1} failed:`, err.name, err.message);
                                        reject(err);
                                    } else {
                                        console.log(`✅ Config ${configIndex + 1} succeeded! Quagga initialized successfully`);
                                        resolve();
                                    }
                                });
                            });

                            // If we get here, initialization succeeded
                            console.log('🚀 Starting Quagga...');
                            Quagga.start();
                            console.log('✅ Quagga.start() completed successfully');

                            setIsInitialized(true);
                            setIsLoading(false);

                            detectionHandlerRef.current = handleBarcodeDetection;
                            Quagga.onDetected(detectionHandlerRef.current);

                            console.log('🎯 Enhanced detection handler registered successfully');

                            // Enhanced video element detection and styling
                            const styleVideoElements = () => {
                                if (scannerRef.current && mountedRef.current) {
                                    console.log('🔍 Searching for video/canvas elements...');

                                    const allVideos = scannerRef.current.querySelectorAll('video');
                                    const allCanvases = scannerRef.current.querySelectorAll('canvas');

                                    console.log(`📺 Found ${allVideos.length} video element(s)`);
                                    console.log(`🎨 Found ${allCanvases.length} canvas element(s)`);

                                    allVideos.forEach((video, index) => {
                                        console.log(`📺 Video ${index} details:`, {
                                            width: video.offsetWidth,
                                            height: video.offsetHeight,
                                            videoWidth: video.videoWidth,
                                            videoHeight: video.videoHeight,
                                            readyState: video.readyState,
                                            paused: video.paused,
                                            muted: video.muted,
                                            autoplay: video.autoplay
                                        });

                                        // Force comprehensive video styling
                                        video.style.width = '100%';
                                        video.style.height = '100%';
                                        video.style.objectFit = 'cover';
                                        video.style.display = 'block';
                                        video.style.position = 'absolute';
                                        video.style.top = '0';
                                        video.style.left = '0';
                                        video.style.zIndex = '1';
                                        video.style.background = 'black';
                                        video.style.opacity = '1';
                                        video.style.visibility = 'visible';

                                        // Ensure video is playing
                                        if (video.paused) {
                                            video.play().catch(e => console.log('Video play failed:', e));
                                        }

                                        console.log(`📺 Video ${index} styled and play attempted`);
                                    });

                                    allCanvases.forEach((canvas, index) => {
                                        console.log(`🎨 Canvas ${index} details:`, {
                                            width: canvas.offsetWidth,
                                            height: canvas.offsetHeight,
                                            canvasWidth: canvas.width,
                                            canvasHeight: canvas.height
                                        });

                                        // Style canvas but keep it visible for debugging
                                        canvas.style.position = 'absolute';
                                        canvas.style.top = '0';
                                        canvas.style.left = '0';
                                        canvas.style.width = '100%';
                                        canvas.style.height = '100%';
                                        canvas.style.zIndex = '2';
                                        canvas.style.pointerEvents = 'none';
                                        canvas.style.opacity = '0.1'; // Very transparent so we can see the video

                                        console.log(`🎨 Canvas ${index} styled`);
                                    });

                                    if (allVideos.length === 0) {
                                        console.error('❌ CRITICAL: No video elements found after successful Quagga start!');
                                        console.log('📋 Scanner container HTML:', scannerRef.current.innerHTML);
                                    }
                                }
                            };

                            // Style elements with multiple attempts
                            styleVideoElements();
                            setTimeout(styleVideoElements, 500);
                            setTimeout(styleVideoElements, 1000);
                            setTimeout(styleVideoElements, 2000);

                            // Success - exit the loop
                            return;

                        } catch (error) {
                            console.error(`❌ Config ${configIndex + 1} failed with error:`, error);

                            // If this was the last config, show error
                            if (configIndex === configsToTry.length - 1) {
                                console.error('❌ All configurations failed');
                                setError('Camera initialization failed. Please try refreshing the page.');
                                setIsLoading(false);
                                return;
                            }

                            // Otherwise, continue to next config
                            console.log(`🔄 Trying next configuration...`);
                            await new Promise(resolve => setTimeout(resolve, 500)); // Wait before next attempt
                        }
                    }
                };

                // Start trying configurations
                await tryConfigs();

            } catch (error) {
                console.error('❌ Scanner setup error:', error);
                if (mountedRef.current) {
                    setError('Camera scanner not supported on this device.');
                    setIsLoading(false);
                }
            }
        };

        // Wait for the camera container to be rendered before initializing
        if (isActive && mountedRef.current) {
            console.log('🕐 Scheduling scanner initialization...');
            console.log('🔍 Debug state:', { isActive, mounted: !!mountedRef.current, isLoading, isInitialized });

            initTimeoutId = setTimeout(() => {
                if (mountedRef.current && scannerRef.current) {
                    console.log('🚀 Starting delayed initialization...');
                    initializeScanner();
                } else {
                    console.log('❌ Component or ref not ready for delayed init');
                    console.log('Component mounted:', !!mountedRef.current);
                    console.log('Scanner ref exists:', !!scannerRef.current);
                    console.log('IsLoading:', isLoading);
                }
            }, 500);
        } else {
            console.log('🚫 Not scheduling init:', { isActive, mounted: !!mountedRef.current, isLoading, isInitialized });
        }

        return () => {
            if (initTimeoutId) {
                clearTimeout(initTimeoutId);
            }
            if (!isActive || !mountedRef.current) {
                cleanupScanner();
            }
        };
    }, [isActive, isInitialized, isMobile, handleBarcodeDetection, cleanupScanner]);

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

    // Mobile-optimized layout (keeping the same UI as before)
    if (isMobile) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col">
                {/* Mobile Header - Fixed at top */}
                <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="text-lg font-medium">📷 Scan Barcode</h3>
                    <TouchEnhancedButton
                        onClick={() => {
                            cleanupScanner();
                            onClose();
                        }}
                        className="text-white text-2xl font-bold w-8 h-8 flex items-center justify-center"
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {error ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg p-6 text-center max-w-sm mx-auto">
                            <div className="text-red-600 mb-4">❌ {error}</div>
                            <div className="text-sm text-gray-500 mb-4">
                                Please ensure camera permissions are enabled.
                            </div>

                            <div className="space-y-3">
                                <TouchEnhancedButton
                                    onClick={async () => {
                                        try {
                                            console.log('🔍 Testing camera permissions...');
                                            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                                            console.log('✅ Camera permission granted');
                                            stream.getTracks().forEach(track => track.stop());

                                            setError(null);
                                            setIsLoading(true);
                                            setTimeout(() => {
                                                if (mountedRef.current) {
                                                    setIsInitialized(false);
                                                }
                                            }, 100);
                                        } catch (testError) {
                                            console.error('❌ Camera test failed:', testError);
                                            setError(`Camera test failed: ${testError.message}`);
                                        }
                                    }}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md"
                                >
                                    🔍 Test Camera Access
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={() => {
                                        cleanupScanner();
                                        onClose();
                                    }}
                                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-md"
                                >
                                    Close Scanner
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Loading State - Overlay on top of camera container */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
                                <div className="text-center text-white">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                    <div className="text-lg">Starting camera...</div>
                                    <div className="text-sm mt-2 opacity-75">
                                        Enhanced validation active
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Camera Container - ALWAYS rendered, hidden by loading overlay when needed */}
                        <div className="flex-1 relative bg-black">
                            {/* Camera View - Full container with proper sizing */}
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
                                    minHeight: '400px' // Ensure minimum height
                                }}
                            />

                            {/* Enhanced Reticle Overlay - Higher z-index - Only show when not loading */}
                            {!isLoading && (
                                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                                    {/* Dark overlay with transparent center */}
                                    <div className="absolute inset-0">
                                        {/* Top overlay */}
                                        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-60"
                                             style={{ height: 'calc(50% - 80px)' }}></div>

                                        {/* Bottom overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60"
                                             style={{ height: 'calc(50% - 80px)' }}></div>

                                        {/* Left overlay */}
                                        <div className="absolute left-0 bg-black bg-opacity-60"
                                             style={{
                                                 top: 'calc(50% - 80px)',
                                                 height: '160px',
                                                 width: 'calc(50% - 140px)'
                                             }}></div>

                                        {/* Right overlay */}
                                        <div className="absolute right-0 bg-black bg-opacity-60"
                                             style={{
                                                 top: 'calc(50% - 80px)',
                                                 height: '160px',
                                                 width: 'calc(50% - 140px)'
                                             }}></div>
                                    </div>

                                    {/* Scanning Target Area - Centered */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-40">
                                        {/* Main scanning frame */}
                                        <div className="w-full h-full border-2 border-red-500 rounded-lg relative bg-transparent">
                                            {/* Animated scanning line */}
                                            {isScanning && (
                                                <div
                                                    className="absolute left-0 right-0 h-1 bg-red-500 shadow-lg"
                                                    style={{
                                                        animation: 'scanline 2s ease-in-out infinite',
                                                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                                                    }}
                                                />
                                            )}

                                            {/* Enhanced corner brackets */}
                                            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
                                            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
                                            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
                                            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>

                                            {/* Center crosshair */}
                                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6">
                                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 transform -translate-y-1/2"></div>
                                                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-500 transform -translate-x-1/2"></div>
                                            </div>

                                            {/* Helper dots in corners of scan area */}
                                            <div className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                            <div className="absolute bottom-2 left-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                            <div className="absolute bottom-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                        </div>
                                    </div>

                                    {/* Instructions - Positioned at top */}
                                    <div className="absolute top-16 left-4 right-4 z-20">
                                        <div className="bg-black bg-opacity-80 text-white text-sm p-4 rounded-lg text-center">
                                            {isScanning ? (
                                                <div>
                                                    <div className="font-semibold text-lg mb-1">📱 Position barcode in the red frame</div>
                                                    <div className="text-xs opacity-90">Hold steady • Ensure good lighting • Keep barcode flat</div>
                                                    <div className="text-xs opacity-75 mt-1">✅ Enhanced validation active</div>
                                                </div>
                                            ) : (
                                                <div className="font-semibold text-green-400 text-lg">✅ Valid barcode detected! Processing...</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status indicator - Bottom */}
                                    <div className="absolute bottom-4 left-4 right-4 z-20">
                                        <div className="bg-black bg-opacity-80 text-white text-center py-2 px-4 rounded-lg">
                                            <div className="text-sm">
                                                Scan #{scanCountRef.current + 1} • {isScanning ? 'Scanning...' : 'Processing...'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Footer - Always visible */}
                        <div className="flex-shrink-0 bg-black px-4 py-3">
                            <TouchEnhancedButton
                                onClick={() => {
                                    cleanupScanner();
                                    onClose();
                                }}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg text-lg font-medium"
                                disabled={!isScanning}
                            >
                                {isScanning ? 'Cancel Scan' : 'Processing...'}
                            </TouchEnhancedButton>
                        </div>
                    </>
                )}

                {/* Enhanced CSS animations */}
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
        );
    }

    // Desktop layout (unchanged)
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-screen overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">📷 Scan Barcode</h3>
                    <TouchEnhancedButton
                        onClick={() => {
                            cleanupScanner();
                            onClose();
                        }}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {error ? (
                    <div className="text-center py-8">
                        <div className="text-red-600 mb-4">❌ {error}</div>
                        <div className="text-sm text-gray-500 mb-4">
                            Please ensure your browser has camera permissions enabled and try again.
                        </div>
                        <TouchEnhancedButton
                            onClick={() => {
                                cleanupScanner();
                                onClose();
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            Close Scanner
                        </TouchEnhancedButton>
                    </div>
                ) : (
                    <>
                        {isLoading && (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <div className="text-gray-600">Starting camera...</div>
                                <div className="text-xs text-gray-500 mt-2">Enhanced validation enabled</div>
                            </div>
                        )}

                        <div className="relative">
                            <div
                                ref={scannerRef}
                                className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden"
                                style={{ display: isLoading ? 'none' : 'block' }}
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
                                            <>📱 Position barcode within the red frame • ✅ Enhanced validation active</>
                                        ) : (
                                            <>✅ Valid barcode detected! Processing...</>
                                        )}
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
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                                    disabled={!isScanning}
                                >
                                    {isScanning ? 'Cancel' : 'Processing...'}
                                </TouchEnhancedButton>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}