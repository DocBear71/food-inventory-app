// file: /src/components/inventory/BarcodeScanner.js v9 - iOS PWA Camera Fixes - Consolidated initialization

'use client';

import {useEffect, useRef, useState, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export default function BarcodeScanner({onBarcodeDetected, onClose, isActive}) {
    const scannerRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isPWA, setIsPWA] = useState(false);
    const cooldownRef = useRef(false);
    const quaggaRef = useRef(null);
    const mountedRef = useRef(true);
    const detectionHandlerRef = useRef(null);
    const scanCountRef = useRef(0);
    const lastValidCodeRef = useRef(null);
    const detectionHistoryRef = useRef([]);
    const streamRef = useRef(null);
    const videoElementRef = useRef(null);

    console.log('🆕 BarcodeScanner v9 loaded - iOS PWA CAMERA FIXES - Consolidated');

    // Detect PWA mode and mobile device
    useEffect(() => {
        const checkEnvironment = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isSmallScreen = window.innerWidth <= 768;
            const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true ||
                document.referrer.includes('android-app://');

            setIsMobile(isMobileDevice || isSmallScreen);
            setIsPWA(isPWAMode);

            console.log('📱 Barcode Scanner Environment:', {
                isMobile: isMobileDevice || isSmallScreen,
                isPWA: isPWAMode,
                userAgent: navigator.userAgent,
                standalone: window.navigator.standalone,
                displayMode: window.matchMedia('(display-mode: standalone)').matches
            });
        };

        checkEnvironment();
        window.addEventListener('resize', checkEnvironment);
        window.addEventListener('orientationchange', checkEnvironment);

        return () => {
            window.removeEventListener('resize', checkEnvironment);
            window.removeEventListener('orientationchange', checkEnvironment);
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

        // Checksum validation for UPC-A (12 digits)
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

        // Checksum validation for EAN-13 (13 digits)
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
    }, []);

    // Simplified iOS PWA camera initialization using the manifest fix
    const initializeCameraStream = useCallback(async () => {
        console.log('📱 Starting barcode scanner camera with iOS PWA detection...');

        try {
            // Use the global detection from our manifest fix (if available)
            const iosFix = window.iosPWACameraFix || {};
            const { isIOS = false, isIOSPWA = false, cameraSupported = true } = iosFix;

            console.log('📱 Barcode Scanner Camera Fix Detection:', { isIOS, isIOSPWA, cameraSupported });

            // Check if camera API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported on this device');
            }

            // If we're in iOS PWA standalone mode, camera won't work
            if (isIOSPWA && !cameraSupported) {
                throw new Error('Camera not available in iOS PWA standalone mode. Please use Safari browser.');
            }

            // Get appropriate constraints for the platform
            let constraints;
            if (window.iosPWACameraHelper?.getIOSCameraConstraints) {
                constraints = window.iosPWACameraHelper.getIOSCameraConstraints();
            } else {
                // Fallback constraints if helper not available
                const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
                if (isIOSDevice) {
                    constraints = [
                        { video: { facingMode: "environment" }, audio: false },
                        { video: true, audio: false }
                    ];
                } else {
                    constraints = [
                        {
                            video: {
                                facingMode: "environment",
                                width: { ideal: 1280, min: 640 },
                                height: { ideal: 720, min: 480 }
                            }
                        },
                        { video: { facingMode: "environment" } },
                        { video: true }
                    ];
                }
            }

            let stream = null;

            // Try each constraint set
            for (let i = 0; i < constraints.length; i++) {
                try {
                    console.log(`📱 Barcode Scanner: Trying constraint set ${i + 1}:`, constraints[i]);
                    stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
                    console.log(`✅ Barcode Scanner: Success with constraint set ${i + 1}`);
                    break;
                } catch (error) {
                    console.log(`❌ Barcode Scanner: Constraint set ${i + 1} failed:`, error.message);
                    if (i === constraints.length - 1) {
                        throw error;
                    }
                }
            }

            if (!stream) {
                throw new Error('All camera initialization attempts failed');
            }

            console.log('✅ Barcode Scanner: Camera stream obtained:', {
                tracks: stream.getTracks().length,
                videoTracks: stream.getVideoTracks().length,
                settings: stream.getVideoTracks()[0]?.getSettings()
            });

            return stream;

        } catch (error) {
            console.error('❌ Barcode Scanner: Camera initialization failed:', error);
            throw error;
        }
    }, []);

// Simplified cleanup function
    const cleanupScanner = useCallback(() => {
        console.log('🧹 Starting scanner cleanup...');

        // Stop any active media streams first
        if (streamRef.current) {
            console.log('🛑 Stopping media stream...');
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log(`🛑 Stopped track: ${track.kind} - ${track.label}`);
            });
            streamRef.current = null;
        }

        // Clean up video element
        if (videoElementRef.current) {
            console.log('📺 Cleaning up video element...');
            videoElementRef.current.pause();
            videoElementRef.current.srcObject = null;
            videoElementRef.current.load();
            videoElementRef.current = null;
        }

        // Clean up Quagga
        if (quaggaRef.current) {
            try {
                if (detectionHandlerRef.current) {
                    console.log('🔇 Removing detection handler');
                    quaggaRef.current.offDetected(detectionHandlerRef.current);
                    detectionHandlerRef.current = null;
                }

                quaggaRef.current.offDetected();
                console.log('🛑 Stopping Quagga');
                quaggaRef.current.stop();

                // Force clear the scanner container
                if (scannerRef.current) {
                    scannerRef.current.innerHTML = '';
                    console.log('🧹 Cleared scanner container HTML');
                }

                quaggaRef.current = null;
            } catch (error) {
                console.log('⚠️ Error during Quagga cleanup:', error);
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

// Enhanced barcode detection handler
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

        // Check decode quality
        if (result.codeResult.decodedCodes && result.codeResult.decodedCodes.length > 0) {
            const avgError = result.codeResult.decodedCodes.reduce((sum, code) => sum + (code.error || 0), 0) / result.codeResult.decodedCodes.length;
            console.log(`📊 Average decode error: ${avgError.toFixed(3)}`);

            if (avgError > 0.1) {
                console.log(`❌ High error rate rejected: ${avgError.toFixed(3)} > 0.1`);
                return;
            }
        }

        const validation = validateUPC(code);
        if (!validation.valid) {
            console.log(`❌ UPC validation failed: ${validation.reason}`);
            return;
        }

        const cleanCode = validation.cleanCode;

        // Check for recent duplicates
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

        cooldownRef.current = true;
        setIsScanning(false);

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

        setTimeout(() => {
            if (mountedRef.current) {
                console.log(`📤 Calling onBarcodeDetected with: "${cleanCode}"`);
                onBarcodeDetected(cleanCode);
            }
        }, 800);
    }, [isScanning, validateUPC, onBarcodeDetected]);

// Enhanced error handling with iOS PWA specific messages
    const handleCameraError = useCallback((error) => {
        console.error('📱 Camera Error:', error);

        let userMessage = 'Camera initialization failed.';
        let suggestions = [];

        // Categorize errors and provide specific guidance
        if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
            if (isPWA) {
                userMessage = 'Camera permission denied. iOS PWAs reset camera permissions each session.';
                suggestions = [
                    'Please allow camera access when prompted',
                    'Try opening the app in Safari browser for full camera functionality'
                ];
            } else {
                userMessage = 'Camera permission denied.';
                suggestions = ['Please allow camera access when prompted'];
            }
        } else if (error.name === 'NotFoundError' || error.message.includes('not found')) {
            userMessage = 'No camera found on this device.';
            suggestions = ['Ensure your device has a working camera'];
        } else if (error.name === 'NotSupportedError' || error.message.includes('not supported')) {
            if (isPWA) {
                userMessage = 'Camera not supported in this iOS PWA context.';
                suggestions = [
                    'This iOS version may have limited PWA camera support',
                    'Try opening the app in Safari browser instead'
                ];
            } else {
                userMessage = 'Camera not supported in this browser.';
                suggestions = ['Try using a different browser'];
            }
        } else if (error.name === 'NotReadableError' || error.message.includes('in use')) {
            userMessage = 'Camera is currently in use by another app.';
            suggestions = ['Close other apps that might be using the camera'];
        }

        return {
            userMessage,
            suggestions,
            isPWARelated: isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent)
        };
    }, [isPWA]);

// Main scanner initialization with consolidated camera handling
    useEffect(() => {
        let Quagga;
        let initTimeoutId;

        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current) {
                console.log('🚫 Skipping init - not ready');
                return;
            }

            try {
                console.log('🚀 Initializing barcode scanner with consolidated camera support...');
                setError(null);
                setIsScanning(true);
                cooldownRef.current = false;
                scanCountRef.current = 0;
                lastValidCodeRef.current = null;
                detectionHistoryRef.current = [];

                // Auto-scroll to scanner view for mobile
                if (isMobile && isActive) {
                    setTimeout(() => {
                        const scannerContainer = document.querySelector('[data-barcode-scanner]');
                        if (scannerContainer) {
                            scannerContainer.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                                inline: 'nearest'
                            });
                            console.log('📱 Auto-scrolled to barcode scanner view');
                        }
                    }, 400);
                }

                // Test camera access using consolidated function
                console.log('🔍 Testing camera access...');
                let testStream;

                try {
                    testStream = await initializeCameraStream();
                    console.log('✅ Camera access test successful');

                    // Keep stream for iOS PWA, stop for others during testing
                    if (isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                        streamRef.current = testStream;
                        console.log('📱 Keeping iOS PWA camera stream active');
                    } else {
                        testStream.getTracks().forEach(track => track.stop());
                    }
                } catch (permissionError) {
                    const errorInfo = handleCameraError(permissionError);
                    console.error('❌ Camera permission test failed:', errorInfo);
                    setError(errorInfo.userMessage);
                    setIsLoading(false);
                    return;
                }

                // Load Quagga
                console.log('📦 Loading Quagga module...');
                const QuaggaModule = await import('@ericblade/quagga2');
                Quagga = QuaggaModule.default;
                quaggaRef.current = Quagga;
                console.log('✅ Quagga module loaded successfully');

                if (!mountedRef.current) {
                    console.log('❌ Component unmounted during init');
                    return;
                }

                // Wait for scanner container
                if (!scannerRef.current) {
                    console.log('❌ Scanner ref is null, waiting...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (!scannerRef.current) {
                        console.log('❌ Scanner ref still null after wait');
                        setError('Scanner container initialization failed');
                        setIsLoading(false);
                        return;
                    }
                }

                // DOM stabilization for iOS PWA
                console.log('⏳ Waiting for DOM element to stabilize...');
                await new Promise(resolve => setTimeout(resolve, isPWA ? 800 : 300));

                if (!scannerRef.current || !mountedRef.current) {
                    console.log('❌ Scanner ref lost during DOM wait');
                    return;
                }

                // Configure Quagga with device-specific settings
                const isIOSPWA = isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent);

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
                        patchSize: isPWA ? "large" : "medium",
                        halfSample: isPWA ? false : true
                    },
                    numOfWorkers: isPWA ? 1 : Math.min(navigator.hardwareConcurrency || 2, 4),
                    frequency: isPWA ? 2 : 3,
                    decoder: {
                        readers: [
                            "ean_reader",
                            "upc_reader",
                            "upc_e_reader"
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

                // Try configurations with consolidated approach
                const configsToTry = [];

                if (isIOSPWA) {
                    // Use existing stream if available
                    if (streamRef.current) {
                        configsToTry.push({
                            ...baseConfig,
                            inputStream: {
                                ...baseConfig.inputStream,
                                constraints: {
                                    deviceId: streamRef.current.getVideoTracks()[0].getSettings().deviceId,
                                    facingMode: "environment"
                                }
                            }
                        });
                    }

                    // iOS PWA fallback configs
                    configsToTry.push(
                        {
                            ...baseConfig,
                            inputStream: {
                                ...baseConfig.inputStream,
                                constraints: {
                                    video: {
                                        facingMode: {ideal: "environment"},
                                        width: {ideal: 1280, min: 640},
                                        height: {ideal: 720, min: 480}
                                    }
                                }
                            }
                        },
                        {
                            ...baseConfig,
                            inputStream: {
                                ...baseConfig.inputStream,
                                constraints: {
                                    facingMode: "environment"
                                }
                            }
                        }
                    );
                } else {
                    // Standard configurations
                    configsToTry.push(
                        {
                            ...baseConfig,
                            inputStream: {
                                ...baseConfig.inputStream,
                                constraints: {
                                    facingMode: "environment"
                                }
                            }
                        }
                    );
                }

                // Try configurations
                for (let configIndex = 0; configIndex < configsToTry.length; configIndex++) {
                    if (!mountedRef.current) {
                        console.log('⚠️ Component unmounted during config attempts');
                        return;
                    }

                    const currentConfig = configsToTry[configIndex];
                    console.log(`🔄 Trying config ${configIndex + 1}/${configsToTry.length}`);

                    try {
                        await new Promise((resolve, reject) => {
                            const timeoutId = setTimeout(() => {
                                reject(new Error('Video initialization timeout after ' + (isIOSPWA ? '20' : '10') + ' seconds'));
                            }, isIOSPWA ? 20000 : 10000); // Even longer timeout for iOS PWA

                            Quagga.init(currentConfig, (err) => {
                                clearTimeout(timeoutId);
                                console.log(`🔄 Quagga.init callback triggered for config ${configIndex + 1}`);

                                if (err) {
                                    console.error(`❌ Config ${configIndex + 1} failed:`, err.name, err.message);
                                    reject(err);
                                } else {
                                    console.log(`✅ Config ${configIndex + 1} succeeded!`);
                                    resolve();
                                }
                            });
                        });

                        console.log('🚀 Starting Quagga...');
                        Quagga.start();
                        console.log('✅ Quagga.start() completed successfully');

                        setIsInitialized(true);
                        setIsLoading(false);

                        detectionHandlerRef.current = handleBarcodeDetection;
                        Quagga.onDetected(detectionHandlerRef.current);

                        console.log('🎯 Enhanced detection handler registered successfully');

                        // Style video elements for proper display
                        const styleVideoElements = () => {
                            if (scannerRef.current && mountedRef.current) {
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
                                        paused: video.paused
                                    });

                                    // Video styling
                                    video.style.width = '100%';
                                    video.style.height = '100%';
                                    video.style.objectFit = 'cover';
                                    video.style.display = 'block';
                                    video.style.position = 'absolute';
                                    video.style.top = '0';
                                    video.style.left = '0';
                                    video.style.zIndex = '1';
                                    video.style.background = 'black';

                                    // iOS PWA specific attributes with enhanced settings
                                    if (isIOSPWA) {
                                        video.setAttribute('playsinline', 'true');
                                        video.setAttribute('webkit-playsinline', 'true');
                                        video.setAttribute('preload', 'metadata');
                                        video.muted = true;
                                        video.autoplay = true;
                                        console.log('📱 Applied enhanced iOS PWA video attributes');

                                        // Force immediate play attempt for iOS PWA
                                        if (video.paused) {
                                            const playPromise = video.play();
                                            if (playPromise !== undefined) {
                                                playPromise.then(() => {
                                                    console.log('📱 iOS PWA: Video play successful immediately');
                                                }).catch(e => {
                                                    console.log('📱 iOS PWA: Initial play failed, will retry:', e);
                                                    setTimeout(() => {
                                                        video.play().catch(e2 => console.log('📱 iOS PWA: Video retry failed:', e2));
                                                    }, 100);
                                                });
                                            }
                                        }
                                    }
                                });

                                allCanvases.forEach((canvas, index) => {
                                    canvas.style.position = 'absolute';
                                    canvas.style.top = '0';
                                    canvas.style.left = '0';
                                    canvas.style.width = '100%';
                                    canvas.style.height = '100%';
                                    canvas.style.zIndex = '2';
                                    canvas.style.pointerEvents = 'none';
                                    canvas.style.opacity = '0.1';

                                    console.log(`🎨 Canvas ${index} styled`);
                                });
                            }
                        };

                        // Apply styling with multiple attempts
                        styleVideoElements();
                        setTimeout(styleVideoElements, 500);
                        setTimeout(styleVideoElements, 1000);
                        if (isPWA) {
                            setTimeout(styleVideoElements, 2000);
                            setTimeout(styleVideoElements, 3000);
                        }

                        return; // Success!

                    } catch (error) {
                        console.error(`❌ Config ${configIndex + 1} failed with error:`, error);

                        if (configIndex === configsToTry.length - 1) {
                            console.error('❌ All configurations failed');

                            // Use the iOS PWA helper for better error messages (if available)
                            let errorMessage = 'Camera initialization failed.';

                            if (window.iosPWACameraHelper?.getIOSCameraGuidance) {
                                const guidance = window.iosPWACameraHelper.getIOSCameraGuidance();
                                if (guidance.hasIssue) {
                                    errorMessage = guidance.message;
                                }
                            } else {
                                // Fallback error handling
                                if (error.name === 'NotAllowedError') {
                                    const isIOSPWA = isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent);
                                    if (isIOSPWA) {
                                        errorMessage = 'Camera access is limited in iOS PWA mode. Try opening the app in Safari browser.';
                                    } else {
                                        errorMessage = 'Camera permission denied. Please allow camera access.';
                                    }
                                } else if (error.name === 'NotFoundError') {
                                    errorMessage = 'No camera found on this device.';
                                } else if (error.name === 'NotSupportedError') {
                                    errorMessage = 'Camera not supported in this browser.';
                                } else if (error.name === 'NotReadableError') {
                                    errorMessage = 'Camera is currently in use by another app.';
                                }
                            }

                            setError(errorMessage);
                            setIsLoading(false);
                            return;
                        }

                        console.log(`🔄 Trying next configuration...`);
                        await new Promise(resolve => setTimeout(resolve, isPWA ? 1000 : 500));
                    }
                }

            } catch (error) {
                console.error('❌ Scanner setup error:', error);
                if (mountedRef.current) {
                    const errorInfo = handleCameraError(error);
                    setError(errorInfo.userMessage);
                    setIsLoading(false);
                }
            }
        };

        if (isActive && mountedRef.current) {
            console.log('🕐 Scheduling scanner initialization...');
            const delay = isPWA ? 1000 : 500;
            initTimeoutId = setTimeout(() => {
                if (mountedRef.current && scannerRef.current) {
                    console.log('🚀 Starting delayed initialization...');
                    initializeScanner();
                } else {
                    console.log('❌ Component or ref not ready for delayed init');
                }
            }, delay);
        }

        return () => {
            if (initTimeoutId) {
                clearTimeout(initTimeoutId);
            }
            if (!isActive || !mountedRef.current) {
                cleanupScanner();
            }
        };
    }, [isActive, isInitialized, isMobile, isPWA, handleBarcodeDetection, cleanupScanner, initializeCameraStream, handleCameraError]);

    useEffect(() => {
        return () => {
            console.log('🧹 Component unmounting, cleaning up scanner...');
            cleanupScanner();
        };
    }, [cleanupScanner]);

// Audio feedback function
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

// Handle retry camera functionality
    const handleRetryCamera = useCallback(async () => {
        console.log('🔄 Retrying camera initialization...');
        setError(null);
        setIsLoading(true);
        setIsInitialized(false);

        try {
            // Test camera access first
            const testStream = await initializeCameraStream();
            testStream.getTracks().forEach(track => track.stop());
            console.log('✅ Camera retry test successful');

            // Brief delay before retry
            setTimeout(() => {
                if (mountedRef.current) {
                    setIsLoading(false);
                    setIsInitialized(false);
                }
            }, 500);

        } catch (retryError) {
            console.error('❌ Camera retry failed:', retryError);
            const errorInfo = handleCameraError(retryError);
            setError(errorInfo.userMessage);
            setIsLoading(false);
        }
    }, [initializeCameraStream, handleCameraError]);

// Handle open in Safari functionality
    const handleOpenInSafari = useCallback(() => {
        const safariInstructions = `To use the barcode scanner with full functionality:

1. Open Safari browser
2. Navigate to: ${window.location.origin}
3. Use the barcode scanner there

This bypasses iOS PWA camera limitations.`;

        if (confirm(`Open app in Safari browser?\n\n${safariInstructions}`)) {
            const link = document.createElement('a');
            link.href = window.location.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }, []);

    if (!isActive) return null;

// Mobile layout with enhanced iOS PWA support
    if (isMobile) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col" data-barcode-scanner>
                {/* Header */}
                <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">📷 Scan Barcode</h3>
                        {isPWA && (
                            <div className="text-xs text-yellow-400">iOS PWA Mode</div>
                        )}
                    </div>
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
                        <div className="bg-white rounded-lg p-6 text-center max-w-sm mx-auto shadow-lg">
                            {/* Header with iOS PWA indicator */}
                            <div className="flex items-center justify-center mb-4">
                                <div className="text-red-600 text-2xl mr-2">❌</div>
                                <div>
                                    <div className="text-red-600 text-lg font-semibold">Camera Access Failed</div>
                                    {isPWA && (
                                        <div className="text-orange-600 text-xs font-medium">iOS PWA Mode</div>
                                    )}
                                </div>
                            </div>

                            {/* Error message */}
                            <div className="text-sm text-gray-700 mb-4 leading-relaxed">
                                {error}
                            </div>

                            {/* iOS PWA specific guidance */}
                            {isPWA && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                    <div className="text-xs text-blue-800">
                                        <div className="font-semibold mb-2 flex items-center">
                                            <span className="mr-1">💡</span>
                                            iOS PWA Camera Limitations:
                                        </div>
                                        <div className="text-left space-y-1">
                                            <div>• Camera permissions reset each PWA session</div>
                                            <div>• Limited camera API support in standalone mode</div>
                                            <div>• Safari browser has full camera access</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="space-y-3">
                                {/* Test Camera Access button */}
                                <TouchEnhancedButton
                                    onClick={handleRetryCamera}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                                >
                                    🔍 Test Camera Access
                                </TouchEnhancedButton>

                                {/* Open in Safari button - only for iOS PWA */}
                                {isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (
                                    <TouchEnhancedButton
                                        onClick={handleOpenInSafari}
                                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                                    >
                                        🌐 Open in Safari Browser
                                    </TouchEnhancedButton>
                                )}

                                {/* Manual UPC Entry */}
                                <TouchEnhancedButton
                                    onClick={() => {
                                        cleanupScanner();
                                        onClose();
                                        setTimeout(() => {
                                            alert('💡 Tip: You can manually enter UPC codes in the UPC/Barcode field, or use the "Search by Name" tab to find products by typing their name.');
                                        }, 300);
                                    }}
                                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                                >
                                    ✏️ Enter UPC Manually Instead
                                </TouchEnhancedButton>

                                {/* Close Scanner button */}
                                <TouchEnhancedButton
                                    onClick={() => {
                                        cleanupScanner();
                                        onClose();
                                    }}
                                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                >
                                    ✕ Close Scanner
                                </TouchEnhancedButton>
                            </div>

                            {/* Device info */}
                            <div className="mt-4 pt-3 border-t border-gray-200">
                                <div className="text-xs text-gray-500 space-y-1">
                                    <div>
                                        iOS {(() => {
                                        const match = navigator.userAgent.match(/OS (\d+_\d+)/);
                                        return match ? match[1].replace('_', '.') : 'Unknown';
                                    })()} • {isPWA ? 'PWA' : 'Browser'} Mode
                                    </div>
                                    <div>
                                        {isPWA ? 'Standalone Web App' : 'Safari Browser'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Loading State */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
                                <div className="text-center text-white">
                                    <div
                                        className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                    <div className="text-lg">
                                        {isPWA ? 'Starting iOS PWA camera...' : 'Starting camera...'}
                                    </div>
                                    <div className="text-sm mt-2 opacity-75">
                                        Enhanced validation active
                                    </div>
                                    {isPWA && (
                                        <div className="text-xs mt-3 opacity-60">
                                            iOS PWA mode may take longer to initialize
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Camera Container */}
                        <div className="flex-1 relative bg-black">
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
                                    minHeight: '400px'
                                }}
                            />

                            {/* Auto-scroll success indicator */}
                            {!isLoading && (
                                <div className="absolute top-16 left-4 right-4 z-20">
                                    <div className="bg-green-900 bg-opacity-80 text-green-200 text-xs p-2 rounded mb-2">
                                        📱 Scanner ready • Auto-scrolled to camera view
                                    </div>
                                </div>
                            )}

                            {/* Reticle Overlay */}
                            {!isLoading && (
                                <div className="absolute inset-0 pointer-events-none" style={{zIndex: 10}}>
                                    {/* Dark overlay areas */}
                                    <div className="absolute inset-0">
                                        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-60"
                                             style={{height: 'calc(50% - 80px)'}}></div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60"
                                             style={{height: 'calc(50% - 80px)'}}></div>
                                        <div className="absolute left-0 bg-black bg-opacity-60"
                                             style={{
                                                 top: 'calc(50% - 80px)',
                                                 height: '160px',
                                                 width: 'calc(50% - 140px)'
                                             }}></div>
                                        <div className="absolute right-0 bg-black bg-opacity-60"
                                             style={{
                                                 top: 'calc(50% - 80px)',
                                                 height: '160px',
                                                 width: 'calc(50% - 140px)'
                                             }}></div>
                                    </div>

                                    {/* Scanning Target Area */}
                                    <div
                                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-40">
                                        <div
                                            className="w-full h-full border-2 border-red-500 rounded-lg relative bg-transparent">
                                            {isScanning && (
                                                <div
                                                    className="absolute left-0 right-0 h-1 bg-red-500 shadow-lg"
                                                    style={{
                                                        animation: isPWA ? 'scanline-slow 3s ease-in-out infinite' : 'scanline 2s ease-in-out infinite',
                                                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                                                    }}
                                                />
                                            )}

                                            {/* Corner indicators */}
                                            <div
                                                className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
                                            <div
                                                className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
                                            <div
                                                className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
                                            <div
                                                className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>

                                            {/* Center crosshair */}
                                            <div
                                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6">
                                                <div
                                                    className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 transform -translate-y-1/2"></div>
                                                <div
                                                    className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-500 transform -translate-x-1/2"></div>
                                            </div>

                                            {/* Corner dots */}
                                            <div
                                                className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                            <div
                                                className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                            <div
                                                className="absolute bottom-2 left-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                            <div
                                                className="absolute bottom-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="absolute top-16 left-4 right-4 z-20">
                                        <div
                                            className="bg-black bg-opacity-80 text-white text-sm p-4 rounded-lg text-center">
                                            {isScanning ? (
                                                <div>
                                                    <div className="font-semibold text-lg mb-1">📱 Position barcode in
                                                        the
                                                        red frame
                                                    </div>
                                                    <div className="text-xs opacity-90">Hold steady • Ensure good
                                                        lighting •
                                                        Keep barcode flat
                                                    </div>
                                                    <div className="text-xs opacity-75 mt-1">
                                                        ✅ Enhanced validation active
                                                        {isPWA && ' • iOS PWA optimized'}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="font-semibold text-green-400 text-lg">✅ Valid barcode
                                                    detected! Processing...</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status indicator */}
                                    <div className="absolute bottom-4 left-4 right-4 z-20">
                                        <div
                                            className="bg-black bg-opacity-80 text-white text-center py-2 px-4 rounded-lg">
                                            <div className="text-sm">
                                                Scan
                                                #{scanCountRef.current + 1} • {isScanning ? 'Scanning...' : 'Processing...'}
                                                {isPWA && ' • PWA Mode'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
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

                    @keyframes scanline-slow {
                        0% {
                            top: 0;
                            opacity: 1;
                        }
                        50% {
                            top: calc(50% - 2px);
                            opacity: 0.8;
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

// Desktop layout
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-screen overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">📷 Scan Barcode</h3>
                        {isPWA && (
                            <div className="text-xs text-orange-600">iOS PWA Mode</div>
                        )}
                    </div>
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
                            {isPWA ? (
                                'iOS PWA camera permissions are reset each session. Please ensure your browser has camera permissions enabled and try again.'
                            ) : (
                                'Please ensure your browser has camera permissions enabled and try again.'
                            )}
                        </div>

                        <div className="space-y-3">
                            <TouchEnhancedButton
                                onClick={handleRetryCamera}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
                            >
                                🔄 Try Again
                            </TouchEnhancedButton>

                            {isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (
                                <TouchEnhancedButton
                                    onClick={handleOpenInSafari}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mr-2"
                                >
                                    🌐 Open in Safari
                                </TouchEnhancedButton>
                            )}

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
                    </div>
                ) : (
                    <>
                        {isLoading && (
                            <div className="text-center py-8">
                                <div
                                    className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <div className="text-gray-600">
                                    {isPWA ? 'Starting iOS PWA camera...' : 'Starting camera...'}
                                </div>
                                <div className="text-xs text-gray-500 mt-2">Enhanced validation enabled</div>
                                {isPWA && (
                                    <div className="text-xs text-orange-600 mt-1">iOS PWA optimization active</div>
                                )}
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
                                    <div
                                        className="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none">
                                        <div className="absolute inset-4 border-2 border-red-500 rounded-lg">
                                            {isScanning && (
                                                <div
                                                    className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse"></div>
                                            )}
                                            <div
                                                className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500"></div>
                                            <div
                                                className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500"></div>
                                            <div
                                                className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500"></div>
                                            <div
                                                className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500"></div>
                                        </div>
                                    </div>

                                    <div
                                        className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
                                        {isScanning ? (
                                            <>📱 Position barcode within the red frame • ✅ Enhanced validation
                                                active{isPWA && ' • iOS PWA optimized'}</>
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