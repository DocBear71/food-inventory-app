'use client';
// file: /src/components/inventory/BarcodeScannerIOS.js v12 - Complete MLKit implementation with full feature parity

import {useEffect, useRef, useState, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {MobileHaptics} from '@/components/mobile/MobileHaptics';
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import FeatureGate, {UsageLimitDisplay} from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import { apiGet } from '@/lib/api-config';
import { PlatformDetection } from '@/utils/PlatformDetection';
import { BarcodeScanner as MLKitBarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function BarcodeScannerIOS({onBarcodeDetected, onClose, isActive}) {
    const scannerContainerRef = useRef(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [scanFeedback, setScanFeedback] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [permissionState, setPermissionState] = useState('unknown');

    // Enhanced barcode analysis state with international support (from BarcodeScanner.js)
    const [barcodeAnalysis, setBarcodeAnalysis] = useState(null);
    const [userRegion, setUserRegion] = useState('US');

    // Platform detection state (missing from previous version)
    const [platformInfo, setPlatformInfo] = useState({
        isIOS: false,
        isAndroid: false,
        isNative: false,
        isPWA: false
    });

    // State management refs
    const mountedRef = useRef(true);
    const scanInProgressRef = useRef(false);
    const lastScanTimeRef = useRef(0);

    // Session management
    const processedCodesRef = useRef(new Set());
    const sessionIdRef = useRef(Date.now());

    // Subscription hooks
    const subscription = useSubscription();
    const [usageInfo, setUsageInfo] = useState(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);

    // Enhanced international barcode format detection with comprehensive GS1 prefixes (from BarcodeScanner.js)
    const detectBarcodeFormat = useCallback((barcode) => {
        const clean = barcode.replace(/\D/g, '');

        if (clean.length === 8) {
            return {
                format: 'EAN-8',
                region: 'GLOBAL',
                country: 'International',
                type: 'short',
                description: 'Short international barcode'
            };
        } else if (clean.length === 12) {
            return {
                format: 'UPC-A',
                region: 'US',
                country: 'United States',
                type: 'standard',
                description: 'US/Canada standard barcode'
            };
        } else if (clean.length === 13) {
            const prefix = clean.substring(0, 3);

            // Enhanced GS1 prefix detection with country mapping (from BarcodeScanner.js)
            const prefixMapping = {
                // US and Canada
                '000-019': { region: 'US', country: 'United States' },
                '030-039': { region: 'US', country: 'United States', type: 'drugs' },
                '040-049': { region: 'RESTRICTED', country: 'Reserved', type: 'internal' },
                '050-059': { region: 'US', country: 'United States', type: 'coupons' },
                '060-139': { region: 'US', country: 'United States' },

                // International regions
                '200-299': { region: 'RESTRICTED', country: 'Internal use', type: 'internal' },
                '300-379': { region: 'FR', country: 'France' },
                '380': { region: 'BG', country: 'Bulgaria' },
                '383': { region: 'SI', country: 'Slovenia' },
                '385': { region: 'HR', country: 'Croatia' },
                '387': { region: 'BA', country: 'Bosnia Herzegovina' },
                '400-440': { region: 'DE', country: 'Germany' },
                '450-459': { region: 'JP', country: 'Japan' },
                '460-469': { region: 'RU', country: 'Russia' },
                '500-509': { region: 'UK', country: 'United Kingdom' },
                '520-521': { region: 'GR', country: 'Greece' },
                '528': { region: 'LB', country: 'Lebanon' },
                '529': { region: 'CY', country: 'Cyprus' },
                '530': { region: 'AL', country: 'Albania' },
                '531': { region: 'MK', country: 'North Macedonia' },
                '535': { region: 'MT', country: 'Malta' },
                '539': { region: 'IE', country: 'Ireland' },
                '540-549': { region: 'BE', country: 'Belgium/Luxembourg' },
                '560': { region: 'PT', country: 'Portugal' },
                '569': { region: 'IS', country: 'Iceland' },
                '570-579': { region: 'DK', country: 'Denmark' },
                '590': { region: 'PL', country: 'Poland' },
                '594': { region: 'RO', country: 'Romania' },
                '599': { region: 'HU', country: 'Hungary' },
                '600-601': { region: 'ZA', country: 'South Africa' },
                '640-649': { region: 'FI', country: 'Finland' },
                '690-695': { region: 'CN', country: 'China' },
                '700-709': { region: 'NO', country: 'Norway' },
                '729': { region: 'IL', country: 'Israel' },
                '730-739': { region: 'SE', country: 'Sweden' },
                '754-755': { region: 'CA', country: 'Canada' },
                '760-769': { region: 'CH', country: 'Switzerland' },
                '770-771': { region: 'CO', country: 'Colombia' },
                '773': { region: 'UY', country: 'Uruguay' },
                '775': { region: 'PE', country: 'Peru' },
                '777': { region: 'BO', country: 'Bolivia' },
                '778-779': { region: 'AR', country: 'Argentina' },
                '780': { region: 'CL', country: 'Chile' },
                '784': { region: 'PY', country: 'Paraguay' },
                '786': { region: 'EC', country: 'Ecuador' },
                '789-790': { region: 'BR', country: 'Brazil' },
                '800-839': { region: 'IT', country: 'Italy' },
                '840-849': { region: 'ES', country: 'Spain' },
                '850': { region: 'CU', country: 'Cuba' },
                '858': { region: 'SK', country: 'Slovakia' },
                '859': { region: 'CZ', country: 'Czech Republic' },
                '860': { region: 'RS', country: 'Serbia' },
                '867': { region: 'KP', country: 'North Korea' },
                '868-869': { region: 'TR', country: 'Turkey' },
                '870-879': { region: 'NL', country: 'Netherlands' },
                '880': { region: 'KR', country: 'South Korea' },
                '885': { region: 'TH', country: 'Thailand' },
                '888': { region: 'SG', country: 'Singapore' },
                '890': { region: 'IN', country: 'India' },
                '893': { region: 'VN', country: 'Vietnam' },
                '896': { region: 'PK', country: 'Pakistan' },
                '899': { region: 'ID', country: 'Indonesia' },
                '900-919': { region: 'AT', country: 'Austria' },
                '930-939': { region: 'AU', country: 'Australia' },
                '940-949': { region: 'NZ', country: 'New Zealand' },
                '955': { region: 'MY', country: 'Malaysia' },
                '958': { region: 'MO', country: 'Macau' }
            };

            // Find matching prefix range
            for (const [range, info] of Object.entries(prefixMapping)) {
                if (range.includes('-')) {
                    const [start, end] = range.split('-').map(Number);
                    const prefixNum = parseInt(prefix);
                    if (prefixNum >= start && prefixNum <= end) {
                        return {
                            format: 'EAN-13',
                            region: info.region,
                            country: info.country,
                            type: info.type || 'standard',
                            description: `EAN-13 from ${info.country}`
                        };
                    }
                } else if (prefix === range) {
                    return {
                        format: 'EAN-13',
                        region: info.region,
                        country: info.country,
                        type: info.type || 'standard',
                        description: `EAN-13 from ${info.country}`
                    };
                }
            }

            // Default for unknown EAN-13 prefixes
            return {
                format: 'EAN-13',
                region: 'UNKNOWN',
                country: 'Unknown',
                type: 'standard',
                description: 'EAN-13 from unknown region'
            };
        } else if (clean.length === 14) {
            return {
                format: 'GTIN-14',
                region: 'GLOBAL',
                country: 'Global',
                type: 'case',
                description: 'Case/packaging barcode'
            };
        }

        return {
            format: 'UNKNOWN',
            region: 'UNKNOWN',
            country: 'Unknown',
            type: 'invalid',
            description: 'Unknown barcode format'
        };
    }, []);

    // Get regional hints and warnings (from BarcodeScanner.js)
    const getRegionalHints = useCallback((analysis, userRegion) => {
        const hints = [];

        if (analysis.region === 'RESTRICTED') {
            hints.push({
                type: 'warning',
                message: 'This appears to be an internal/restricted barcode'
            });
        }

        if (analysis.region === 'UK' && userRegion !== 'UK') {
            hints.push({
                type: 'info',
                message: 'This appears to be a UK product'
            });
        }

        if (analysis.region === 'US' && userRegion === 'UK') {
            hints.push({
                type: 'info',
                message: 'This appears to be a US product - may have limited UK availability'
            });
        }

        if (analysis.region === 'EU' && userRegion === 'US') {
            hints.push({
                type: 'info',
                message: 'This appears to be a European product'
            });
        }

        if (analysis.format === 'EAN-8') {
            hints.push({
                type: 'info',
                message: 'Short barcode detected - may have limited database coverage'
            });
        }

        if (analysis.type === 'case') {
            hints.push({
                type: 'warning',
                message: 'This appears to be a case/packaging barcode, not individual product'
            });
        }

        return hints;
    }, []);

    // Enhanced international barcode analysis and validation (from BarcodeScanner.js)
    const analyzeAndValidateBarcode = useCallback((code) => {
        let cleanCode = code.replace(/\D/g, '');
        console.log(`MLKit iOS: Analyzing barcode: "${code}" -> "${cleanCode}"`);

        // Enhanced validation with international support
        if (cleanCode.length < 6 || cleanCode.length > 14) {
            return {
                valid: false,
                reason: 'invalid_length',
                message: `Barcode length ${cleanCode.length} is outside valid range (6-14 digits)`
            };
        }

        // Detect and analyze barcode format
        const analysis = detectBarcodeFormat(cleanCode);
        console.log(`MLKit iOS: Barcode analysis:`, analysis);

        // Enhanced validation based on format
        if (analysis.format === 'UNKNOWN') {
            return {
                valid: false,
                reason: 'unknown_format',
                message: 'Unknown barcode format'
            };
        }

        // Auto-pad common formats
        if (cleanCode.length === 11 && analysis.format === 'UPC-A') {
            cleanCode = '0' + cleanCode;
            console.log(`MLKit iOS: Padded 11-digit UPC to UPC-A: ${cleanCode}`);
        } else if (cleanCode.length >= 6 && cleanCode.length <= 10) {
            const originalLength = cleanCode.length;
            cleanCode = cleanCode.padStart(12, '0');
            console.log(`MLKit iOS: Padded ${originalLength}-digit code to standard UPC: ${cleanCode}`);
        }

        // Enhanced pattern validation
        if (cleanCode.match(/^0+$/) || cleanCode.match(/^(.)\1{9,}$/)) {
            return {
                valid: false,
                reason: 'invalid_pattern',
                message: 'Invalid barcode pattern detected'
            };
        }

        // Regional validation hints
        const regionalHints = getRegionalHints(analysis, userRegion);

        return {
            valid: true,
            cleanCode,
            analysis,
            regionalHints,
            message: `Valid ${analysis.format} barcode from ${analysis.country}`
        };
    }, [detectBarcodeFormat, getRegionalHints, userRegion]);

    // Load user's region preference from currency (from BarcodeScanner.js)
    const loadUserRegion = useCallback(async () => {
        try {
            const response = await apiGet('/api/user/profile');
            if (response.ok) {
                const data = await response.json();
                const currency = data.user?.currencyPreferences?.currency || 'USD';

                // Map currency to region for better barcode handling
                const currencyToRegion = {
                    'USD': 'US', 'GBP': 'UK', 'EUR': 'EU', 'CAD': 'CA',
                    'AUD': 'AU', 'JPY': 'JP', 'CNY': 'CN'
                };

                const detectedRegion = currencyToRegion[currency] || 'US';
                setUserRegion(detectedRegion);
                console.log(`MLKit iOS: User region detected: ${detectedRegion} (from currency: ${currency})`);
            }
        } catch (error) {
            console.error('Failed to load user region:', error);
        }
    }, []);

    // Load usage information and user preferences (from BarcodeScanner.js)
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

    // Platform and device detection (missing from previous version)
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice || window.innerWidth <= 768);
        };

        const detectPlatform = () => {
            const detectedInfo = {
                isIOS: PlatformDetection.isIOS(),
                isAndroid: PlatformDetection.isAndroid(),
                isNative: Capacitor.isNativePlatform(),
                isPWA: PlatformDetection.isPWAInstalled(),
                platform: Capacitor.getPlatform()
            };
            setPlatformInfo(detectedInfo);
            console.log('MLKit iOS: Platform detection:', detectedInfo);
        };

        checkMobile();
        detectPlatform();

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Initialize on component activation
    useEffect(() => {
        if (isActive && !isInitialized && mountedRef.current) {
            sessionIdRef.current = Date.now();
            processedCodesRef.current = new Set();
            setIsInitialized(true);
            setIsLoading(false);
            loadUserRegion();
        }
    }, [isActive, isInitialized, loadUserRegion]);

    // Load usage information
    useEffect(() => {
        if (isActive) {
            loadUsageInfo();
        }
    }, [isActive, loadUsageInfo]);

    // Enhanced camera permission handling (from BarcodeScanner.js)
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
                // Test camera access for web
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

    // Audio feedback (from BarcodeScanner.js)
    const playBeepSound = useCallback(() => {
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
    }, []);

    // Enhanced visual and audio feedback with regional context (from BarcodeScanner.js)
    const provideScanFeedback = useCallback((type, message, analysis = null) => {
        let feedbackMessage = message;

        if (analysis && analysis.analysis) {
            feedbackMessage += ` (${analysis.analysis.format}${analysis.analysis.country ? ` - ${analysis.analysis.country}` : ''})`;
        }

        setScanFeedback(feedbackMessage);
        setBarcodeAnalysis(analysis);

        // Haptic feedback
        const triggerHapticFeedback = async () => {
            try {
                switch (type) {
                    case 'success':
                        await MobileHaptics.scanSuccess();
                        break;
                    case 'error':
                        await MobileHaptics.scanError();
                        break;
                    case 'warning':
                        await MobileHaptics.warning();
                        break;
                    case 'processing':
                        await MobileHaptics.light();
                        break;
                    default:
                        await MobileHaptics.light();
                        break;
                }
            } catch (error) {
                console.log('Haptic feedback failed:', error);
            }
        };

        triggerHapticFeedback();

        // Visual feedback with regional colors (from BarcodeScanner.js)
        if (scannerContainerRef.current && mountedRef.current) {
            let color = '#10B981'; // Default success color

            if (type === 'success') {
                // Regional color coding
                if (analysis?.analysis?.region === 'UK') color = '#3B82F6'; // Blue for UK
                else if (analysis?.analysis?.region === 'EU') color = '#8B5CF6'; // Purple for EU
                else if (analysis?.analysis?.region === 'DE') color = '#8B5CF6'; // Purple for Germany
                else if (analysis?.analysis?.region === 'US') color = '#10B981'; // Green for US
            } else if (type === 'processing') {
                color = '#F59E0B'; // Orange for processing
            } else {
                color = '#EF4444'; // Red for errors
            }

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

        // Clear feedback after delay (from BarcodeScanner.js)
        setTimeout(() => {
            if (mountedRef.current) {
                setScanFeedback('');
                setBarcodeAnalysis(null);
            }
        }, 4000); // Longer timeout for international context
    }, [playBeepSound]);

    // Process MLKit barcode result with enhanced international analysis
    const processBarcodeResult = useCallback((code) => {
        const now = Date.now();

        // Prevent rapid duplicate processing
        if (scanInProgressRef.current || (now - lastScanTimeRef.current) < 1500) {
            return false;
        }

        console.log(`MLKit iOS: Processing barcode: "${code}"`);

        // Enhanced validation and analysis
        const validation = analyzeAndValidateBarcode(code);
        if (!validation.valid) {
            console.log(`MLKit iOS: Invalid barcode: ${validation.reason} - ${validation.message}`);
            provideScanFeedback('error', validation.message);
            return false;
        }

        const cleanCode = validation.cleanCode;
        console.log(`MLKit iOS: Valid barcode analysis:`, validation);

        // Prevent processing same code in this session
        const sessionKey = `${sessionIdRef.current}-${cleanCode}`;
        if (processedCodesRef.current.has(sessionKey)) {
            console.log(`MLKit iOS: Already processed "${cleanCode}" in this session`);
            provideScanFeedback('warning', 'Barcode already scanned in this session');
            return false;
        }

        // Mark as processed immediately
        processedCodesRef.current.add(sessionKey);
        scanInProgressRef.current = true;
        lastScanTimeRef.current = now;

        provideScanFeedback('success', 'International barcode scanned successfully!', validation);

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

        return true;
    }, [analyzeAndValidateBarcode, onBarcodeDetected, onClose, provideScanFeedback]);

    // Enhanced error handling with international context (from BarcodeScanner.js)
    const handleScanError = useCallback(async (error) => {
        console.error('MLKit iOS: Scanner error:', error);

        if (error.message.includes('Permission') || error.message.includes('permission')) {
            setError('Camera permission required. Please allow camera access and try again.');
        } else if (error.message.includes('NotFoundError') || error.message.includes('no camera')) {
            setError('No camera found. Please ensure your device has a camera.');
        } else if (error.message.includes('NotReadableError')) {
            setError('Camera is in use by another application. Please close other camera apps and try again.');
        } else {
            setError('Scanner initialization failed. Please try again.');
        }

        setIsInitialized(false);
        setIsLoading(false);
        setIsScanning(false);
    }, []);

    // Enhanced MLKit scanning for native platforms with international support (from BarcodeScanner.js)
    const startMLKitScanning = useCallback(async () => {
        try {
            provideScanFeedback('processing', 'Opening enhanced international scanner...');

            const { barcodes } = await MLKitBarcodeScanner.scan({
                formats: [
                    'UPC_A', 'UPC_E', 'EAN_8', 'EAN_13',
                    'CODE_128', 'CODE_39', 'CODE_93',
                    'CODABAR', 'ITF', 'DATA_MATRIX', 'QR_CODE'
                ],
                lensFacing: 'back'
            });

            if (barcodes && barcodes.length > 0) {
                const barcode = barcodes[0];
                console.log('MLKit iOS: Barcode detected', {
                    value: barcode.rawValue,
                    format: barcode.format
                });

                // Process the barcode result using the enhanced analysis
                const processed = processBarcodeResult(barcode.rawValue);

                if (!processed) {
                    // Processing failed (duplicate, invalid, etc.) - already handled by processBarcodeResult
                    return;
                }
            } else {
                provideScanFeedback('error', 'No barcode detected');
            }
        } catch (error) {
            console.error('MLKit iOS: Scan error', error);
            if (!error.message.includes('cancelled')) {
                provideScanFeedback('error', 'MLKit scanning failed');
            }
        }
    }, [provideScanFeedback, processBarcodeResult]);

    // Main scanner initialization (from BarcodeScanner.js)
    useEffect(() => {
        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current) {
                return;
            }

            // Wait for platform info
            if (!platformInfo.isIOS && !platformInfo.isAndroid && !platformInfo.isPWA) {
                console.log('MLKit iOS: Waiting for platform detection...');
                return;
            }

            try {
                // Reset session state completely
                sessionIdRef.current = Date.now();
                processedCodesRef.current = new Set();
                scanInProgressRef.current = false;

                setError(null);
                setIsScanning(true);
                setScanFeedback('');
                setBarcodeAnalysis(null);

                console.log(`MLKit iOS: Starting enhanced international scanner session: ${sessionIdRef.current}`);

                const hasPermission = await requestCameraPermission();
                if (!hasPermission) {
                    setIsLoading(false);
                    return;
                }

                if (Capacitor.isNativePlatform()) {
                    console.log('MLKit iOS: Native platform - using enhanced MLKit');
                    setIsInitialized(true);
                    setIsLoading(false);
                    setTimeout(() => startMLKitScanning(), 800);
                } else {
                    console.log('MLKit iOS: Web platform - MLKit fallback');
                    await handleScanError(new Error('MLKit requires native platform'));
                }
            } catch (error) {
                console.error('MLKit iOS: Scanner setup error:', error);
                if (mountedRef.current) {
                    await handleScanError(error);
                    setIsLoading(false);
                }
            }
        };

        if (isActive && mountedRef.current) {
            initializeScanner();
        }
    }, [isActive, isInitialized, platformInfo, requestCameraPermission, startMLKitScanning, handleScanError]);

    // Cleanup function (from BarcodeScanner.js)
    const cleanupScanner = useCallback(async () => {
        console.log('MLKit iOS: Cleaning up enhanced international scanner...');

        setIsScanning(false);
        scanInProgressRef.current = false;
        setIsInitialized(false);
        setIsLoading(true);
        setError(null);
        setPermissionState('unknown');
        setScanFeedback('');
        setBarcodeAnalysis(null);

        processedCodesRef.current = new Set();
        sessionIdRef.current = Date.now();
        lastScanTimeRef.current = 0;

        console.log('MLKit iOS: Scanner cleanup completed');
    }, []);

    // Close handler (from BarcodeScanner.js)
    const handleScannerClose = useCallback(async () => {
        console.log('MLKit iOS: Enhanced scanner close requested');
        await cleanupScanner();

        setTimeout(() => {
            if (mountedRef.current && onClose) {
                onClose();
            }
        }, 200);
    }, [cleanupScanner, onClose]);

    // Enhanced retry scanner initialization (from BarcodeScanner.js)
    const retryScanner = useCallback(async () => {
        console.log('MLKit iOS: Retrying enhanced international scanner initialization...');

        setError(null);
        setIsLoading(true);
        setIsInitialized(false);
        setIsScanning(true);
        setScanFeedback('');
        setBarcodeAnalysis(null);

        sessionIdRef.current = Date.now();
        processedCodesRef.current = new Set();

        await cleanupScanner();

        setTimeout(() => {
            if (mountedRef.current) {
                setIsInitialized(false);
            }
        }, 500);
    }, [cleanupScanner]);

    // Cleanup on unmount (from BarcodeScanner.js)
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            cleanupScanner();
        };
    }, [cleanupScanner]);

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
                                    onClick={() => NativeNavigation.navigateTo({ path: '/pricing?source=upc-limit' })}
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
                    {/* Enhanced Header with International Context (from BarcodeScanner.js) */}
                    <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium">MLKit International Scanner</h3>
                            <div className="text-sm text-gray-300 mt-1">
                                {scanFeedback || `Scanning for ${userRegion} region`}
                            </div>
                            {/* Enhanced barcode analysis display (from BarcodeScanner.js) */}
                            {barcodeAnalysis && (
                                <div className="text-xs text-blue-300 mt-1">
                                    {barcodeAnalysis.message}
                                    {barcodeAnalysis.regionalHints && barcodeAnalysis.regionalHints.length > 0 && (
                                        <div className="mt-1">
                                            {barcodeAnalysis.regionalHints.map((hint, i) => (
                                                <div key={i} className={`text-xs ${
                                                    hint.type === 'warning' ? 'text-orange-300' :
                                                        hint.type === 'error' ? 'text-red-300' : 'text-blue-300'
                                                }`}>
                                                    {hint.message}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isLoadingUsage && usageInfo && (
                                <div className="text-xs text-gray-400 mt-1">
                                    {usageInfo.monthlyLimit === 'unlimited' ? (
                                        'Unlimited scans'
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

                    {/* Mobile Error Display (from BarcodeScanner.js) */}
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
                            {/* Loading State (from BarcodeScanner.js) */}
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
                                    <div className="text-center text-white">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                        <div className="text-lg">
                                            {permissionState === 'requesting' ? 'Requesting camera permission...' : 'Starting international scanner...'}
                                        </div>
                                        <div className="text-sm mt-2 opacity-75">
                                            Enhanced for {userRegion} products • Powered by MLKit
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Scanner Interface - Native MLKit */}
                            {Capacitor.isNativePlatform() ? (
                                // Native: Enhanced MLKit interface (from BarcodeScanner.js)
                                <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                                    <div className="text-center text-white px-6">
                                        <div className="mb-8">
                                            <div className="w-32 h-32 mx-auto mb-6 border-4 border-white rounded-2xl flex items-center justify-center">
                                                <span className="text-6xl">🌍</span>
                                            </div>
                                            <h2 className="text-2xl font-bold mb-2">MLKit International Scanner Ready</h2>
                                            <p className="text-gray-300 text-lg">
                                                Enhanced barcode scanning with global product support
                                            </p>
                                            <p className="text-sm text-blue-300 mt-2">
                                                Optimized for {userRegion} region
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
                                // Web fallback - should not reach here for iOS
                                <div className="flex-1 flex items-center justify-center p-4">
                                    <div className="bg-white rounded-lg p-6 text-center max-w-sm mx-auto">
                                        <div className="text-orange-600 mb-4 text-2xl">⚠️</div>
                                        <div className="text-orange-600 font-medium mb-4">
                                            MLKit requires native iOS platform
                                        </div>
                                        <TouchEnhancedButton
                                            onClick={handleScannerClose}
                                            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md"
                                        >
                                            Close Scanner
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            )}

                            {/* Footer (from BarcodeScanner.js) */}
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
                // Desktop version - enhanced with international context (from BarcodeScanner.js)
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4 max-h-screen overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">🌍 MLKit International Scanner</h3>
                                <div className="text-xs text-gray-500 mt-1">Enhanced MLKit • {userRegion} optimized</div>
                                {!isLoadingUsage && usageInfo && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        {usageInfo.monthlyLimit === 'unlimited' ? (
                                            'Unlimited scans available'
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
                                        <div className="text-gray-600">Starting MLKit international scanner...</div>
                                    </div>
                                )}

                                <div className="relative">
                                    <div className="w-full h-80 bg-gray-900 rounded-lg flex items-center justify-center">
                                        <div className="text-center text-white">
                                            <div className="text-4xl mb-4">🌍</div>
                                            <h3 className="text-xl font-semibold mb-2">MLKit Scanner</h3>
                                            <p className="text-gray-300 mb-4">Click below to start scanning</p>
                                            {!isLoading && (
                                                <TouchEnhancedButton
                                                    onClick={startMLKitScanning}
                                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
                                                >
                                                    Start MLKit Scan
                                                </TouchEnhancedButton>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {!isLoading && (
                                    <div className="mt-4 text-center">
                                        <TouchEnhancedButton
                                            onClick={handleScannerClose}
                                            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                                        >
                                            Close
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