// file: /src/components/inventory/BarcodeScanner.js v8 - iOS PWA Camera Fixes for black screen issues

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

    console.log('🆕 BarcodeScanner v8 loaded - iOS PWA CAMERA FIXES');

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

            console.log('📱 Environment:', {
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
            return { valid: false, reason: 'invalid_length' };
        }

        if (cleanCode.match(/^0+$/)) {
            console.log('❌ All zeros detected');
            return { valid: false, reason: 'all_zeros' };
        }

        if (/^(.)\1+$/.test(cleanCode)) {
            console.log('❌ All same digit detected');
            return { valid: false, reason: 'all_same' };
        }

        if (cleanCode.length >= 10) {
            const uniqueDigits = new Set(cleanCode).size;
            if (uniqueDigits < 3) {
                console.log(`❌ Insufficient digit variation: only ${uniqueDigits} unique digits`);
                return { valid: false, reason: 'insufficient_variation' };
            }
        }

        const invalidPatterns = [
            /^123456/, /^111111/, /^000000/, /^999999/, /1234567890/,
        ];

        for (const pattern of invalidPatterns) {
            if (pattern.test(cleanCode)) {
                console.log(`❌ Invalid pattern detected: ${pattern}`);
                return { valid: false, reason: 'invalid_pattern' };
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
                return { valid: false, reason: 'checksum_failed' };
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
                return { valid: false, reason: 'checksum_failed' };
            }
        }

        console.log(`✅ UPC validation passed: "${cleanCode}"`);
        return { valid: true, cleanCode };
    }, []);

    // Enhanced cleanup function for iOS PWA
    const cleanupScanner = useCallback(() => {
        console.log('🧹 Starting iOS PWA scanner cleanup...');

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
            videoElementRef.current.load(); // Force cleanup
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

        console.log('✅ iOS PWA scanner cleanup completed');
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

        const now = Date.now();
        detectionHistoryRef.current = detectionHistoryRef.current.filter(entry => now - entry.timestamp < 5000);

        const recentDetection = detectionHistoryRef.current.find(entry => entry.code === cleanCode);
        if (recentDetection) {
            console.log(`⏩ Duplicate detection ignored: "${cleanCode}" was detected ${now - recentDetection.timestamp}ms ago`);
            return;
        }

        detectionHistoryRef.current.push({ code: cleanCode, timestamp: now });

        if (lastValidCodeRef.current === cleanCode) {
            console.log(`⏩ Same code as last detection, ignoring: "${cleanCode}"`);
            return;
        }

        console.log(`✅ Valid UPC accepted: "${cleanCode}"`);
        lastValidCodeRef.current = cleanCode;

        cooldownRef.current = true;
        setIsScanning(false);

        playBeepSound();

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

    // iOS PWA-specific camera initialization
    const initializeIOSPWACamera = useCallback(async () => {
        console.log('📱 Starting iOS PWA camera initialization...');

        try {
            // Enhanced iOS PWA camera constraints
            const iosPWAConstraints = {
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280, min: 640, max: 1920 },
                    height: { ideal: 720, min: 480, max: 1080 },
                    frameRate: { ideal: 30, min: 15, max: 60 },
                    // iOS-specific enhancements
                    aspectRatio: { ideal: 16/9 },
                    resizeMode: "crop-and-scale"
                },
                audio: false
            };

            console.log('📱 Requesting iOS PWA camera with constraints:', iosPWAConstraints);

            const stream = await navigator.mediaDevices.getUserMedia(iosPWAConstraints);

            console.log('✅ iOS PWA camera stream obtained:', {
                id: stream.id,
                active: stream.active,
                tracks: stream.getTracks().map(track => ({
                    kind: track.kind,
                    label: track.label,
                    enabled: track.enabled,
                    readyState: track.readyState,
                    settings: track.getSettings()
                }))
            });

            streamRef.current = stream;

            // Store reference to video track for iOS PWA cleanup
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                console.log('📹 Video track details:', {
                    label: videoTrack.label,
                    settings: videoTrack.getSettings(),
                    capabilities: videoTrack.getCapabilities()
                });
            }

            return stream;
        } catch (error) {
            console.error('❌ iOS PWA camera initialization failed:', error);
            throw error;
        }
    }, []);

    // Main scanner initialization with iOS PWA fixes
    useEffect(() => {
        let Quagga;
        let initTimeoutId;

        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current) {
                console.log('🚫 Skipping init - not active, already initialized, or unmounted');
                return;
            }

            try {
                console.log('🚀 Initializing iOS PWA-optimized barcode scanner...', { isPWA, isMobile });
                setError(null);
                setIsScanning(true);
                cooldownRef.current = false;
                scanCountRef.current = 0;
                lastValidCodeRef.current = null;
                detectionHistoryRef.current = [];

                // AUTO-SCROLL TO SCANNER VIEW
                // For mobile devices, auto-scroll to the scanner when it becomes active
                if (isMobile && isActive) {
                    setTimeout(() => {
                        // Find the scanner container and scroll to it
                        const scannerContainer = document.querySelector('[data-barcode-scanner]');
                        if (scannerContainer) {
                            scannerContainer.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                                inline: 'nearest'
                            });
                            console.log('📱 Auto-scrolled to barcode scanner view');
                        } else {
                            // Fallback: scroll to the scanner ref element
                            if (scannerRef.current) {
                                scannerRef.current.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                    inline: 'nearest'
                                });
                                console.log('📱 Auto-scrolled to scanner element');
                            }
                        }
                    }, 400); // Small delay to ensure rendering
                }

                // Enhanced camera availability check for iOS PWA
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Camera API not supported on this device or browser');
                }

                // iOS PWA camera permission handling
                console.log('🔍 Testing iOS PWA camera access...');
                let testStream;

                try {
                    if (isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                        // Use iOS PWA-specific initialization
                        testStream = await initializeIOSPWACamera();
                    } else {
                        // Standard camera test
                        testStream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: "environment" }
                        });
                    }

                    console.log('✅ iOS PWA camera access test successful');

                    // Keep stream reference for iOS PWA
                    if (isPWA) {
                        streamRef.current = testStream;
                        console.log('📱 Keeping iOS PWA stream active for scanner initialization');
                    } else {
                        // Stop test stream for non-PWA
                        testStream.getTracks().forEach(track => track.stop());
                    }
                } catch (permissionError) {
                    console.error('❌ iOS PWA camera permission test failed:', permissionError);

                    let errorMessage = 'Camera access denied';
                    if (permissionError.name === 'NotAllowedError') {
                        if (isPWA) {
                            errorMessage = 'Camera permission denied. iOS PWAs require camera permission on each session. Please allow camera access and try again.';
                        } else {
                            errorMessage = 'Camera permission denied. Please allow camera access and try again.';
                        }
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

                // iOS PWA DOM stabilization
                console.log('⏳ Waiting for iOS PWA DOM element to stabilize...');
                await new Promise(resolve => setTimeout(resolve, isPWA ? 800 : 300));

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

                // iOS PWA-optimized configuration
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
                        halfSample: isPWA ? false : true // Better quality for PWA
                    },
                    numOfWorkers: isPWA ? 1 : Math.min(navigator.hardwareConcurrency || 2, 4),
                    frequency: isPWA ? 2 : 3, // Slower frequency for PWA stability
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

                // iOS PWA-specific configurations
                const iosPWAConfigs = [
                    // Config 1: Use existing stream if available (iOS PWA)
                    ...(streamRef.current ? [{
                        ...baseConfig,
                        inputStream: {
                            ...baseConfig.inputStream,
                            constraints: {
                                deviceId: streamRef.current.getVideoTracks()[0].getSettings().deviceId,
                                facingMode: "environment"
                            }
                        }
                    }] : []),
                    // Config 2: iOS PWA optimized constraints
                    {
                        ...baseConfig,
                        inputStream: {
                            ...baseConfig.inputStream,
                            constraints: {
                                video: {
                                    facingMode: { ideal: "environment" },
                                    width: { ideal: 1280, min: 640 },
                                    height: { ideal: 720, min: 480 },
                                    frameRate: { ideal: 30 }
                                }
                            }
                        }
                    },
                    // Config 3: Fallback for iOS PWA
                    {
                        ...baseConfig,
                        inputStream: {
                            ...baseConfig.inputStream,
                            constraints: {
                                facingMode: "environment"
                            }
                        }
                    }
                ];

                const standardConfigs = [
                    {
                        ...baseConfig,
                        inputStream: {
                            ...baseConfig.inputStream,
                            constraints: {
                                facingMode: "environment"
                            }
                        }
                    },
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
                    }
                ];

                const configsToTry = isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent) ?
                    iosPWAConfigs :
                    (isMobile ? standardConfigs : [{
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
                    }]);

                console.log('📋 Will try configs for iOS PWA:', isPWA, 'Total configs:', configsToTry.length);

                // Try configurations with iOS PWA handling
                const tryConfigs = async () => {
                    for (let configIndex = 0; configIndex < configsToTry.length; configIndex++) {
                        if (!mountedRef.current) {
                            console.log('⚠️ Component unmounted during config attempts');
                            return;
                        }

                        const currentConfig = configsToTry[configIndex];
                        console.log(`🔄 Trying iOS PWA config ${configIndex + 1}/${configsToTry.length}:`, currentConfig.inputStream.constraints);

                        try {
                            await new Promise((resolve, reject) => {
                                const timeoutId = setTimeout(() => {
                                    reject(new Error('iOS PWA Quagga init timeout'));
                                }, isPWA ? 15000 : 10000); // Longer timeout for iOS PWA

                                Quagga.init(currentConfig, (err) => {
                                    clearTimeout(timeoutId);
                                    console.log(`🔄 iOS PWA Quagga.init callback triggered for config ${configIndex + 1}`);

                                    if (err) {
                                        console.error(`❌ iOS PWA Config ${configIndex + 1} failed:`, err.name, err.message);
                                        reject(err);
                                    } else {
                                        console.log(`✅ iOS PWA Config ${configIndex + 1} succeeded! Quagga initialized successfully`);
                                        resolve();
                                    }
                                });
                            });

                            console.log('🚀 Starting iOS PWA Quagga...');
                            Quagga.start();
                            console.log('✅ iOS PWA Quagga.start() completed successfully');

                            setIsInitialized(true);
                            setIsLoading(false);

                            detectionHandlerRef.current = handleBarcodeDetection;
                            Quagga.onDetected(detectionHandlerRef.current);

                            console.log('🎯 iOS PWA Enhanced detection handler registered successfully');

                            // iOS PWA-specific video element handling
                            const styleVideoElements = () => {
                                if (scannerRef.current && mountedRef.current) {
                                    console.log('🔍 iOS PWA: Searching for video/canvas elements...');

                                    const allVideos = scannerRef.current.querySelectorAll('video');
                                    const allCanvases = scannerRef.current.querySelectorAll('canvas');

                                    console.log(`📺 iOS PWA: Found ${allVideos.length} video element(s)`);
                                    console.log(`🎨 iOS PWA: Found ${allCanvases.length} canvas element(s)`);

                                    allVideos.forEach((video, index) => {
                                        console.log(`📺 iOS PWA Video ${index} details:`, {
                                            width: video.offsetWidth,
                                            height: video.offsetHeight,
                                            videoWidth: video.videoWidth,
                                            videoHeight: video.videoHeight,
                                            readyState: video.readyState,
                                            paused: video.paused,
                                            muted: video.muted,
                                            autoplay: video.autoplay
                                        });

                                        // iOS PWA-specific video styling
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

                                        // iOS PWA-specific attributes
                                        video.setAttribute('playsinline', 'true');
                                        video.setAttribute('webkit-playsinline', 'true');
                                        video.muted = true;
                                        video.autoplay = true;

                                        // Store reference for cleanup
                                        videoElementRef.current = video;

                                        // Force play for iOS PWA
                                        if (video.paused) {
                                            const playPromise = video.play();
                                            if (playPromise !== undefined) {
                                                playPromise.catch(e => {
                                                    console.log('📺 iOS PWA Video play failed:', e);
                                                    // Try again with user interaction simulation
                                                    setTimeout(() => {
                                                        video.play().catch(e2 => console.log('📺 iOS PWA Video retry play failed:', e2));
                                                    }, 100);
                                                });
                                            }
                                        }

                                        console.log(`📺 iOS PWA Video ${index} styled and play attempted`);
                                    });

                                    allCanvases.forEach((canvas, index) => {
                                        console.log(`🎨 iOS PWA Canvas ${index} details:`, {
                                            width: canvas.offsetWidth,
                                            height: canvas.offsetHeight,
                                            canvasWidth: canvas.width,
                                            canvasHeight: canvas.height
                                        });

                                        canvas.style.position = 'absolute';
                                        canvas.style.top = '0';
                                        canvas.style.left = '0';
                                        canvas.style.width = '100%';
                                        canvas.style.height = '100%';
                                        canvas.style.zIndex = '2';
                                        canvas.style.pointerEvents = 'none';
                                        canvas.style.opacity = '0.1';

                                        console.log(`🎨 iOS PWA Canvas ${index} styled`);
                                    });

                                    if (allVideos.length === 0) {
                                        console.error('❌ CRITICAL iOS PWA: No video elements found after successful Quagga start!');
                                        console.log('📋 iOS PWA Scanner container HTML:', scannerRef.current.innerHTML);
                                    }
                                }
                            };

                            // iOS PWA: Multiple styling attempts with longer delays
                            styleVideoElements();
                            setTimeout(styleVideoElements, 500);
                            setTimeout(styleVideoElements, 1000);
                            setTimeout(styleVideoElements, 2000);
                            if (isPWA) {
                                setTimeout(styleVideoElements, 3000);
                                setTimeout(styleVideoElements, 5000);
                            }

                            return;

                        } catch (error) {
                            console.error(`❌ iOS PWA Config ${configIndex + 1} failed with error:`, error);

                            if (configIndex === configsToTry.length - 1) {
                                console.error('❌ All iOS PWA configurations failed');
                                setError(isPWA ?
                                    'iOS PWA camera initialization failed. Try opening the app in Safari browser first.' :
                                    'Camera initialization failed. Please try refreshing the page.');
                                setIsLoading(false);
                                return;
                            }

                            console.log(`🔄 Trying next iOS PWA configuration...`);
                            await new Promise(resolve => setTimeout(resolve, isPWA ? 1000 : 500));
                        }
                    }
                };

                await tryConfigs();

            } catch (error) {
                console.error('❌ iOS PWA Scanner setup error:', error);
                if (mountedRef.current) {
                    setError(isPWA ?
                        'iOS PWA camera scanner initialization failed. Please ensure camera permissions are granted.' :
                        'Camera scanner not supported on this device.');
                    setIsLoading(false);
                }
            }
        };

        if (isActive && mountedRef.current) {
            console.log('🕐 Scheduling iOS PWA scanner initialization...');
            console.log('🔍 Debug state:', { isActive, mounted: !!mountedRef.current, isLoading, isInitialized, isPWA });

            // Longer delay for iOS PWA to ensure proper initialization
            const delay = isPWA ? 1000 : 500;
            initTimeoutId = setTimeout(() => {
                if (mountedRef.current && scannerRef.current) {
                    console.log('🚀 Starting delayed iOS PWA initialization...');
                    initializeScanner();
                } else {
                    console.log('❌ Component or ref not ready for delayed iOS PWA init');
                    console.log('Component mounted:', !!mountedRef.current);
                    console.log('Scanner ref exists:', !!scannerRef.current);
                    console.log('IsLoading:', isLoading);
                }
            }, delay);
        } else {
            console.log('🚫 Not scheduling iOS PWA init:', { isActive, mounted: !!mountedRef.current, isLoading, isInitialized });
        }

        return () => {
            if (initTimeoutId) {
                clearTimeout(initTimeoutId);
            }
            if (!isActive || !mountedRef.current) {
                cleanupScanner();
            }
        };
    }, [isActive, isInitialized, isMobile, isPWA, handleBarcodeDetection, cleanupScanner, initializeIOSPWACamera]);

    useEffect(() => {
        return () => {
            console.log('🧹 iOS PWA Component unmounting, cleaning up scanner...');
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

    // iOS PWA-optimized mobile layout
    if (isMobile) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col" data-barcode-scanner>
                {/* Enhanced Mobile Header for iOS PWA */}
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
                        <div className="bg-white rounded-lg p-6 text-center max-w-sm mx-auto">
                            <div className="text-red-600 mb-4">❌ {error}</div>
                            <div className="text-sm text-gray-500 mb-4">
                                {isPWA ? (
                                    <>
                                        iOS PWA camera permissions are reset each session.
                                        Please ensure camera permissions are enabled.
                                        {'\n\n'}
                                        Try opening the app in Safari first if issues persist.
                                    </>
                                ) : (
                                    'Please ensure camera permissions are enabled.'
                                )}
                            </div>

                            <div className="space-y-3">
                                <TouchEnhancedButton
                                    onClick={async () => {
                                        try {
                                            console.log('🔍 Testing iOS PWA camera permissions...');

                                            let testStream;
                                            if (isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                                                testStream = await initializeIOSPWACamera();
                                            } else {
                                                testStream = await navigator.mediaDevices.getUserMedia({ video: true });
                                            }

                                            console.log('✅ iOS PWA Camera permission granted');
                                            testStream.getTracks().forEach(track => track.stop());

                                            setError(null);
                                            setIsLoading(true);
                                            setTimeout(() => {
                                                if (mountedRef.current) {
                                                    setIsInitialized(false);
                                                }
                                            }, 100);
                                        } catch (testError) {
                                            console.error('❌ iOS PWA Camera test failed:', testError);
                                            setError(`Camera test failed: ${testError.message}`);
                                        }
                                    }}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md"
                                >
                                    🔍 Test Camera Access
                                </TouchEnhancedButton>

                                {isPWA && (
                                    <TouchEnhancedButton
                                        onClick={() => {
                                            // Suggest opening in Safari
                                            if (confirm('Try opening this app in Safari browser instead?\n\nThis may resolve iOS PWA camera issues.')) {
                                                window.location.href = window.location.href;
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-md"
                                    >
                                        🌐 Open in Safari
                                    </TouchEnhancedButton>
                                )}

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
                        {/* Enhanced Loading State for iOS PWA */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
                                <div className="text-center text-white">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
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

                        {/* Enhanced Camera Container for iOS PWA */}
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

                            {/* Enhanced Reticle Overlay for iOS PWA */}
                            {!isLoading && (
                                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                                    <div className="absolute inset-0">
                                        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-60"
                                             style={{ height: 'calc(50% - 80px)' }}></div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60"
                                             style={{ height: 'calc(50% - 80px)' }}></div>
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

                                    {/* Enhanced Scanning Target Area for iOS PWA */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-40">
                                        <div className="w-full h-full border-2 border-red-500 rounded-lg relative bg-transparent">
                                            {isScanning && (
                                                <div
                                                    className="absolute left-0 right-0 h-1 bg-red-500 shadow-lg"
                                                    style={{
                                                        animation: isPWA ? 'scanline-slow 3s ease-in-out infinite' : 'scanline 2s ease-in-out infinite',
                                                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                                                    }}
                                                />
                                            )}

                                            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
                                            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
                                            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
                                            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>

                                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6">
                                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 transform -translate-y-1/2"></div>
                                                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-500 transform -translate-x-1/2"></div>
                                            </div>

                                            <div className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                            <div className="absolute bottom-2 left-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                            <div className="absolute bottom-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
                                        </div>
                                    </div>

                                    {/* Enhanced Instructions for iOS PWA */}
                                    <div className="absolute top-16 left-4 right-4 z-20">
                                        <div className="bg-black bg-opacity-80 text-white text-sm p-4 rounded-lg text-center">
                                            {isScanning ? (
                                                <div>
                                                    <div className="font-semibold text-lg mb-1">📱 Position barcode in the red frame</div>
                                                    <div className="text-xs opacity-90">Hold steady • Ensure good lighting • Keep barcode flat</div>
                                                    <div className="text-xs opacity-75 mt-1">
                                                        ✅ Enhanced validation active
                                                        {isPWA && ' • iOS PWA optimized'}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="font-semibold text-green-400 text-lg">✅ Valid barcode detected! Processing...</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Enhanced Status indicator for iOS PWA */}
                                    <div className="absolute bottom-4 left-4 right-4 z-20">
                                        <div className="bg-black bg-opacity-80 text-white text-center py-2 px-4 rounded-lg">
                                            <div className="text-sm">
                                                Scan #{scanCountRef.current + 1} • {isScanning ? 'Scanning...' : 'Processing...'}
                                                {isPWA && ' • PWA Mode'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Enhanced Mobile Footer for iOS PWA */}
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

                {/* Enhanced CSS animations for iOS PWA */}
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

    // Enhanced Desktop layout with iOS PWA awareness
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
                                            <>📱 Position barcode within the red frame • ✅ Enhanced validation active{isPWA && ' • iOS PWA optimized'}</>
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