// file: /src/components/inventory/BarcodeScanner.js v16 - Enhanced with international barcode support

import {useEffect, useRef, useState, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { BarcodeScanner as MLKitBarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import FeatureGate, {UsageLimitDisplay} from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import { apiGet } from '@/lib/api-config';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

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

    // Enhanced barcode analysis state
    const [barcodeAnalysis, setBarcodeAnalysis] = useState(null);
    const [userRegion, setUserRegion] = useState('US'); // Default to US

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

    // Load user's region preference from currency
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

                setUserRegion(currencyToRegion[currency] || 'US');
                console.log(`🌍 User region detected: ${currencyToRegion[currency] || 'US'} (from currency: ${currency})`);
            }
        } catch (error) {
            console.error('Failed to load user region:', error);
        }
    }, []);

    // Load usage information and user preferences
    useEffect(() => {
        if (isActive) {
            loadUsageInfo();
            loadUserRegion();
        }
    }, [isActive, loadUsageInfo, loadUserRegion]);

    // Enhanced international barcode validation and analysis
    const analyzeAndValidateBarcode = useCallback((code) => {
        let cleanCode = code.replace(/\D/g, '');
        console.log(`🔍 Analyzing barcode: "${code}" -> "${cleanCode}"`);

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
        console.log(`📊 Barcode analysis:`, analysis);

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
            console.log(`🔧 Padded 11-digit UPC to UPC-A: ${cleanCode}`);
        } else if (cleanCode.length >= 6 && cleanCode.length <= 10) {
            const originalLength = cleanCode.length;
            cleanCode = cleanCode.padStart(12, '0');
            console.log(`🔧 Padded ${originalLength}-digit code to standard UPC: ${cleanCode}`);
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
            message: `Valid ${analysis.format} barcode${analysis.country ? ` from ${analysis.country}` : ''}`
        };
    }, [userRegion]);

    // Enhanced barcode format detection with GS1 prefixes
    function detectBarcodeFormat(barcode) {
        const clean = barcode.replace(/\D/g, '');

        if (clean.length === 8) {
            return {
                format: 'EAN-8',
                region: 'GLOBAL',
                type: 'short',
                description: 'Short international barcode'
            };
        } else if (clean.length === 12) {
            return {
                format: 'UPC-A',
                region: 'US',
                type: 'standard',
                description: 'US/Canada standard barcode'
            };
        } else if (clean.length === 13) {
            const prefix = clean.substring(0, 3);

            // Enhanced GS1 prefix detection with country mapping
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
                type: 'case',
                description: 'Case/packaging barcode'
            };
        }

        return {
            format: 'UNKNOWN',
            region: 'UNKNOWN',
            type: 'invalid',
            description: 'Unknown barcode format'
        };
    }

    // Get regional hints and warnings
    function getRegionalHints(analysis, userRegion) {
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
    }

    // Enhanced visual and audio feedback with regional context
    const provideScanFeedback = useCallback((type, message, analysis = null) => {
        let feedbackMessage = message;

        if (analysis && analysis.analysis) {
            feedbackMessage += ` (${analysis.analysis.format}${analysis.analysis.country ? ` - ${analysis.analysis.country}` : ''})`;
        }

        setScanFeedback(feedbackMessage);
        setBarcodeAnalysis(analysis);

        // Visual feedback with regional colors
        if (scannerContainerRef.current && mountedRef.current) {
            let color = '#10B981'; // Default success color

            if (type === 'success') {
                // Regional color coding
                if (analysis?.analysis?.region === 'UK') color = '#3B82F6'; // Blue for UK
                else if (analysis?.analysis?.region === 'EU') color = '#8B5CF6'; // Purple for EU
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

        // Clear feedback after delay
        setTimeout(() => {
            if (mountedRef.current) {
                setScanFeedback('');
                setBarcodeAnalysis(null);
            }
        }, 4000); // Longer timeout for international context
    }, []);

    // Enhanced barcode detection with international analysis
    const handleBarcodeDetection = useCallback(async (code) => {
        const now = Date.now();

        // Prevent rapid duplicate processing
        if (scanInProgressRef.current || (now - lastScanTimeRef.current) < 1500) {
            return;
        }

        console.log(`📱 ZXing barcode detected: "${code}"`);

        // Enhanced validation and analysis
        const validation = analyzeAndValidateBarcode(code);
        if (!validation.valid) {
            console.log(`❌ Invalid barcode: ${validation.reason} - ${validation.message}`);
            provideScanFeedback('error', validation.message);
            return;
        }

        const cleanCode = validation.cleanCode;
        console.log(`✅ Valid barcode analysis:`, validation);

        // Prevent processing same code in this session
        const sessionKey = `${sessionIdRef.current}-${cleanCode}`;
        if (processedCodesRef.current.has(sessionKey)) {
            console.log(`⏩ Already processed "${cleanCode}" in this session`);
            provideScanFeedback('warning', 'Barcode already scanned in this session');
            return;
        }

        // Mark as processed immediately
        processedCodesRef.current.add(sessionKey);
        scanInProgressRef.current = true;
        lastScanTimeRef.current = now;

        console.log(`✅ Processing barcode: "${cleanCode}"`);

        // Stop scanning and provide enhanced feedback
        setIsScanning(false);
        provideScanFeedback('success', 'Barcode captured successfully!', validation);

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

    }, [analyzeAndValidateBarcode, onBarcodeDetected, onClose, provideScanFeedback]);

    // Enhanced camera permission handling
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
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Camera Permission Denied',
                        message: 'Camera permission denied. Please enable camera access in settings.'
                    });
                    return false;
                }
            } catch (error) {
                setPermissionState('denied');
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Permission Failed',
                    message: `Camera permission failed: ${error.message}`
                });
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Camera Access Denied',
                    message: 'Camera access denied. Please allow camera access and try again.'
                });
                return false;
            }
        }
    }, []);

    // Enhanced MLKit scanning for native platforms
    const startMLKitScanning = useCallback(async () => {
        try {
            provideScanFeedback('processing', 'Opening enhanced international scanner...');

            const { barcodes } = await MLKitBarcodeScanner.scan();

            if (barcodes && barcodes.length > 0) {
                const barcode = barcodes[0];
                const validation = analyzeAndValidateBarcode(barcode.rawValue);

                if (validation.valid) {
                    const sessionKey = `${sessionIdRef.current}-${validation.cleanCode}`;
                    if (!processedCodesRef.current.has(sessionKey)) {
                        processedCodesRef.current.add(sessionKey);
                        provideScanFeedback('success', 'International barcode scanned successfully!', validation);
                        setTimeout(() => {
                            onBarcodeDetected(validation.cleanCode);
                            setTimeout(() => onClose(), 500);
                        }, 300);
                    } else {
                        provideScanFeedback('error', 'Barcode already processed');
                    }
                } else {
                    provideScanFeedback('error', validation.message);
                }
            } else {
                provideScanFeedback('error', 'No barcode detected');
            }
        } catch (error) {
            if (!error.message.includes('cancelled')) {
                provideScanFeedback('error', 'Scanning failed');
            }
        }
    }, [analyzeAndValidateBarcode, onBarcodeDetected, onClose, provideScanFeedback]);

    // Keep all existing error handling, scanner initialization, and cleanup functions
    // (The existing handleScanError, initializeZXingScanner, cleanupScanner, etc. remain the same)

    // Enhanced error handling with international context
    const handleScanError = useCallback(async (error) => {
        console.error('🚨 International scanner error:', error);

        const {NativeDialog} = await import('@/components/mobile/NativeDialog');
        if (error.message.includes('Permission') || error.message.includes('permission')) {
            await NativeDialog.showError({
                title: 'Camera Permission Required',
                message: 'Camera permission required. Please allow camera access and try again.'
            });
        } else if (error.message.includes('NotFoundError') || error.message.includes('no camera')) {
            await NativeDialog.showError({
                title: 'No Camera Found',
                message: 'No camera found. Please ensure your device has a camera.'
            });
        } else if (error.message.includes('NotReadableError')) {
            await NativeDialog.showError({
                title: 'Camera In Use',
                message: 'Camera is in use by another application. Please close other camera apps and try again.'
            });
        } else {
            await NativeDialog.showError({
                title: 'Scanner Failed',
                message: 'Scanner initialization failed. Please try again.'
            });
        }

        setIsInitialized(false);
        setIsLoading(false);
        setIsScanning(false);
    }, []);

    // Update the scanner initialization with better error handling
    const initializeZXingScanner = useCallback(async () => {
        try {
            console.log('🚀 Initializing enhanced international ZXing scanner...');

            const { BrowserMultiFormatReader } = await import('@zxing/library');

            const codeReader = new BrowserMultiFormatReader();
            codeReaderRef.current = codeReader;

            let videoInputDevices;
            try {
                videoInputDevices = await codeReader.listVideoInputDevices();
                console.log('📹 Available cameras:', videoInputDevices.length);
            } catch (deviceError) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Camera Access Failed',
                    message: 'Unable to access camera devices. Please check camera permissions.'
                });
                return;
            }

            if (!videoInputDevices || videoInputDevices.length === 0) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'No Camera Found',
                    message: 'No camera devices found on this device.'
                });
                return;
            }

            const selectedDeviceId = videoInputDevices.find(device =>
                device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('environment')
            )?.deviceId || videoInputDevices[0]?.deviceId;

            console.log('📷 Using camera:', selectedDeviceId);

            try {
                const stream = await codeReader.decodeFromVideoDevice(
                    selectedDeviceId,
                    videoRef.current,
                    (result, error) => {
                        if (result) {
                            const code = result.getText();
                            console.log('📱 Enhanced ZXing detected:', code);
                            handleBarcodeDetection(code);
                        }
                        if (error && !error.message.includes('No MultiFormat Readers')) {
                            console.log('ZXing scan attempt:', error.message);
                        }
                    }
                );

                streamRef.current = stream;
                console.log('✅ Enhanced international ZXing scanner started successfully');

            } catch (streamError) {
                console.error('Stream error:', streamError);
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Camera Stream Failed',
                    message: 'Failed to start camera stream. Camera may be in use by another application.'
                });
                return;
            }

        } catch (error) {
            console.error('❌ Enhanced ZXing initialization error:', error);
            handleScanError(error);
            throw error;
        }
    }, [handleBarcodeDetection, handleScanError]);

    // Keep all existing useEffect hooks and cleanup functions unchanged
    // (The existing initialization, cleanup, and device detection logic remains the same)

    // Main scanner initialization
    useEffect(() => {
        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current) {
                return;
            }

            try {
                sessionIdRef.current = Date.now();
                processedCodesRef.current = new Set();

                setError(null);
                setIsScanning(true);
                setScanFeedback('');

                console.log(`🚀 Starting enhanced international scanner session: ${sessionIdRef.current}`);

                const hasPermission = await requestCameraPermission();
                if (!hasPermission) {
                    setIsLoading(false);
                    return;
                }

                if (Capacitor.isNativePlatform()) {
                    console.log('📱 Native platform - using enhanced MLKit');
                    setIsInitialized(true);
                    setIsLoading(false);
                    setTimeout(() => startMLKitScanning(), 800);
                } else {
                    console.log('🌐 Web platform - using enhanced international ZXing');
                    await initializeZXingScanner();

                    if (mountedRef.current) {
                        setIsInitialized(true);
                        setIsLoading(false);
                        setError(null);
                    }
                }
            } catch (error) {
                console.error('❌ Enhanced scanner setup error:', error);
                if (mountedRef.current) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Scanner Failed',
                        message: `Scanner initialization failed: ${error.message}`
                    });
                    setIsLoading(false);
                }
            }
        };

        if (isActive && mountedRef.current) {
            initializeScanner();
        }
    }, [isActive, isInitialized, requestCameraPermission, startMLKitScanning, initializeZXingScanner]);

    // Keep all existing cleanup, error handling, and UI rendering logic unchanged
    // Only enhance the feedback display sections

    // Cleanup function (unchanged)
    const cleanupScanner = useCallback(async () => {
        console.log('🧹 Cleaning up enhanced international scanner...');

        setIsScanning(false);
        scanInProgressRef.current = false;

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        if (codeReaderRef.current) {
            try {
                await codeReaderRef.current.reset();
                console.log('✅ Enhanced ZXing code reader reset');
            } catch (error) {
                console.log('⚠️ ZXing cleanup error:', error.message);
            }
            codeReaderRef.current = null;
        }

        if (streamRef.current) {
            try {
                streamRef.current.getTracks().forEach(track => track.stop());
                console.log('✅ Video stream stopped');
            } catch (error) {
                console.log('⚠️ Stream cleanup error:', error.message);
            }
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setIsInitialized(false);
        setIsLoading(true);
        setError(null);
        setPermissionState('unknown');
        setScanFeedback('');
        setBarcodeAnalysis(null);

        processedCodesRef.current = new Set();
        sessionIdRef.current = Date.now();
        lastScanTimeRef.current = 0;

        console.log('✅ Enhanced scanner cleanup completed');
    }, []);

    // Close handler (unchanged)
    const handleScannerClose = useCallback(async () => {
        console.log('🚫 Enhanced scanner close requested');
        await cleanupScanner();

        setTimeout(() => {
            if (mountedRef.current && onClose) {
                onClose();
            }
        }, 200);
    }, [cleanupScanner, onClose]);

    // Enhanced retry scanner initialization
    const retryScanner = useCallback(async () => {
        console.log('🔄 Retrying enhanced international scanner initialization...');

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

    // Detect mobile device (unchanged)
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice || window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Cleanup on unmount (unchanged)
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            cleanupScanner();
        };
    }, [cleanupScanner]);

    // Audio feedback (unchanged)
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
                                    onClick={() => NativeNavigation.navigateTo({ path: '/pricing?source=upc-limit', router })}
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
                    {/* Enhanced Header with International Context */}
                    <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium">🌍 International Scanner</h3>
                            <div className="text-sm text-gray-300 mt-1">
                                {scanFeedback || `Scanning for ${userRegion} region`}
                            </div>
                            {/* Enhanced barcode analysis display */}
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
                                <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
                                    <div className="text-center text-white">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                        <div className="text-lg">
                                            {permissionState === 'requesting' ? 'Requesting camera permission...' : 'Starting international scanner...'}
                                        </div>
                                        <div className="text-sm mt-2 opacity-75">
                                            Enhanced for {userRegion} products • Powered by ZXing
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Scanner Interface */}
                            {Capacitor.isNativePlatform() ? (
                                // Native: Enhanced MLKit interface
                                <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                                    <div className="text-center text-white px-6">
                                        <div className="mb-8">
                                            <div className="w-32 h-32 mx-auto mb-6 border-4 border-white rounded-2xl flex items-center justify-center">
                                                <span className="text-6xl">🌍</span>
                                            </div>
                                            <h2 className="text-2xl font-bold mb-2">International Scanner Ready</h2>
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
                                // Web: Enhanced ZXing interface
                                <div className="flex-1 relative bg-black overflow-hidden" ref={scannerContainerRef}>
                                    <video
                                        ref={videoRef}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        autoPlay
                                        playsInline
                                        muted
                                    />

                                    {/* Enhanced ZXing Scanner Overlay */}
                                    {!isLoading && (
                                        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="relative w-80 h-48 border-2 border-transparent">
                                                    {/* Enhanced corner brackets with regional colors */}
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

                                                    {/* Enhanced scanning indicator */}
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

                                                    {/* Enhanced scanning line animation */}
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

                                            {/* Enhanced instruction overlay with international context */}
                                            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg border border-white border-opacity-30">
                                                <div className="text-center">
                                                    <div className="text-lg font-medium mb-2">
                                                        {scanFeedback || (isScanning ? 'Position barcode in white frame' : 'Processing...')}
                                                    </div>
                                                    {barcodeAnalysis && barcodeAnalysis.regionalHints && (
                                                        <div className="text-sm mb-2">
                                                            {barcodeAnalysis.regionalHints.map((hint, i) => (
                                                                <div key={i} className={`${
                                                                    hint.type === 'warning' ? 'text-orange-300' :
                                                                        hint.type === 'error' ? 'text-red-300' : 'text-blue-300'
                                                                }`}>
                                                                    {hint.message}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="text-sm opacity-75">
                                                        International ZXing scanner • {userRegion} optimized • Global product support
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
                // Desktop version (enhanced with international context)
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4 max-h-screen overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">🌍 International Scanner</h3>
                                <div className="text-xs text-gray-500 mt-1">Enhanced ZXing • {userRegion} optimized</div>
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
                                        <div className="text-gray-600">Starting international ZXing scanner...</div>
                                    </div>
                                )}

                                <div className="relative">
                                    <video
                                        ref={videoRef}
                                        className="w-full h-80 bg-gray-200 rounded-lg object-cover"
                                        style={{ display: isLoading ? 'none' : 'block' }}
                                        autoPlay
                                        playsInline
                                        muted
                                    />

                                    {/* Enhanced Desktop overlay */}
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
                                                    <div className="absolute top-0 left-0 w-6 h-6 rounded-tl" style={{ borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff' }}></div>
                                                    <div className="absolute top-0 right-0 w-6 h-6 rounded-tr" style={{ borderTop: '2px solid #ffffff', borderRight: '2px solid #ffffff' }}></div>
                                                    <div className="absolute bottom-0 left-0 w-6 h-6 rounded-bl" style={{ borderBottom: '2px solid #ffffff', borderLeft: '2px solid #ffffff' }}></div>
                                                    <div className="absolute bottom-0 right-0 w-6 h-6 rounded-br" style={{ borderBottom: '2px solid #ffffff', borderRight: '2px solid #ffffff' }}></div>
                                                </div>
                                            </div>

                                            <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-90 text-white text-sm p-3 rounded border border-white border-opacity-30">
                                                <div className="text-center">
                                                    <div className="font-medium">
                                                        {scanFeedback || (isScanning ? 'International ZXing scanner active' : 'Processing...')}
                                                    </div>
                                                    {barcodeAnalysis && barcodeAnalysis.regionalHints && (
                                                        <div className="text-xs mt-1">
                                                            {barcodeAnalysis.regionalHints.map((hint, i) => (
                                                                <div key={i} className={`${
                                                                    hint.type === 'warning' ? 'text-orange-300' :
                                                                        hint.type === 'error' ? 'text-red-300' : 'text-blue-300'
                                                                }`}>
                                                                    {hint.message}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="text-xs opacity-75 mt-1">
                                                        Global product support • {userRegion} optimized • Enhanced accuracy
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