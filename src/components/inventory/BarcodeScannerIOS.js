'use client';
// file: /src/components/inventory/BarcodeScannerIOS.js v4 - Fixed iOS initialization and Android cancellation issues

import {useEffect, useRef, useState, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {MobileHaptics} from '@/components/mobile/MobileHaptics';
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import FeatureGate, {UsageLimitDisplay} from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import { apiGet } from '@/lib/api-config';
import { PlatformDetection } from '@/utils/PlatformDetection';

// Import native barcode scanner with error handling
let nativeBarcodeScanner = null;
let capacitorBarcodeScanner = null;

// Dynamically import scanners to handle missing plugins gracefully
const initializeScanners = async () => {
    try {
        // Try to import native iOS scanner
        const nativeModule = await import('@/plugins/native-barcode-scanner');
        nativeBarcodeScanner = nativeModule;
        console.log('🍎 Native iOS scanner module loaded');
    } catch (error) {
        console.log('⚠️ Native iOS scanner not available:', error.message);
    }

    try {
        // Try to import Capacitor scanner
        const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
        capacitorBarcodeScanner = BarcodeScanner;
        console.log('📱 Capacitor barcode scanner loaded');
    } catch (error) {
        console.log('⚠️ Capacitor barcode scanner not available:', error.message);
    }
};

import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function BarcodeScannerIOS({onBarcodeDetected, onClose, isActive}) {
    const scannerContainerRef = useRef(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [scanFeedback, setScanFeedback] = useState('');
    const [useNativeScanner, setUseNativeScanner] = useState(false);
    const [platformInfo, setPlatformInfo] = useState({
        isIOS: false,
        isAndroid: false,
        isNative: false,
        isPWA: false
    });

    // Enhanced barcode analysis state
    const [barcodeAnalysis, setBarcodeAnalysis] = useState(null);
    const [userRegion, setUserRegion] = useState('US');

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

    // FIXED: Initialize platform info immediately and properly with correct method names
    useEffect(() => {
        const initializePlatformInfo = async () => {
            console.log('🔍 Initializing platform detection...');

            // Get platform info using the correct method names from PlatformDetection
            const detectedInfo = {
                isIOS: PlatformDetection.isIOS(),
                isAndroid: PlatformDetection.isAndroid(),
                isNative: PlatformDetection.isRunningInMobileApp(), // Use correct method name
                isPWA: PlatformDetection.isPWAInstalled(), // Use correct method name
                userAgent: navigator.userAgent
            };

            console.log('📱 Platform detected:', detectedInfo);
            setPlatformInfo(detectedInfo);

            // Initialize scanner modules
            await initializeScanners();

            // Determine which scanner to use
            const shouldUseNative = detectedInfo.isIOS && nativeBarcodeScanner && nativeBarcodeScanner.isNativeScannerAvailable;
            setUseNativeScanner(shouldUseNative);

            console.log(`🔧 Scanner selected: ${shouldUseNative ? 'Native iOS' : 'Capacitor fallback'}`);
        };

        initializePlatformInfo();
    }, []);

    // Load usage information
    const loadUsageInfo = useCallback(async () => {
        try {
            const response = await apiGet('/api/user/usage/barcode-scanning');
            if (response.ok) {
                const data = await response.json();
                setUsageInfo(data);
            }
        } catch (error) {
            console.log('Could not load usage info:', error);
        }
    }, []);

    useEffect(() => {
        loadUsageInfo();
    }, [loadUsageInfo]);

    // Barcode format detection (simplified version)
    const detectBarcodeFormat = useCallback((code) => {
        const length = code.length;

        if (length === 12 || length === 13) {
            if (length === 12) {
                return { format: 'UPC-A', region: 'US', country: 'United States' };
            } else {
                const prefix = code.substring(0, 3);
                if (prefix >= '000' && prefix <= '019') {
                    return { format: 'UPC-A', region: 'US', country: 'United States' };
                } else if (prefix >= '020' && prefix <= '029') {
                    return { format: 'EAN-13', region: 'US', country: 'United States (restricted)' };
                } else if (prefix >= '400' && prefix <= '440') {
                    return { format: 'EAN-13', region: 'DE', country: 'Germany' };
                } else if (prefix >= '500' && prefix <= '509') {
                    return { format: 'EAN-13', region: 'UK', country: 'United Kingdom' };
                } else {
                    return { format: 'EAN-13', region: 'INT', country: 'International' };
                }
            }
        } else if (length === 8) {
            return { format: 'EAN-8', region: 'INT', country: 'International' };
        } else if (length === 6) {
            return { format: 'UPC-E', region: 'US', country: 'United States' };
        }

        return { format: 'UNKNOWN', region: 'UNKNOWN', country: 'Unknown' };
    }, []);

    // Get regional hints for user
    const getRegionalHints = useCallback((analysis, userRegion) => {
        const hints = [];

        if (analysis.region !== userRegion) {
            hints.push({
                type: 'info',
                message: `This appears to be a ${analysis.country} product`
            });
        }

        return hints;
    }, []);

    // Enhanced international barcode validation and analysis
    const analyzeAndValidateBarcode = useCallback((code) => {
        let cleanCode = code.replace(/\D/g, '');
        console.log(`🍎 iOS analyzing barcode: "${code}" -> "${cleanCode}"`);

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
        console.log(`🍎 iOS barcode analysis:`, analysis);

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
            console.log(`🍎 iOS padded 11-digit UPC to UPC-A: ${cleanCode}`);
        } else if (cleanCode.length >= 6 && cleanCode.length <= 10) {
            const originalLength = cleanCode.length;
            cleanCode = cleanCode.padStart(12, '0');
            console.log(`🍎 iOS padded ${originalLength}-digit code to standard UPC: ${cleanCode}`);
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
            message: `Valid ${analysis.format} barcode${analysis.country ? ` - ${analysis.country}` : ''}`
        };
    }, [detectBarcodeFormat, getRegionalHints, userRegion]);

    // Audio feedback
    const playBeepSound = useCallback(() => {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmASBSuB0PHdhzUIG2K99+SYHAYLTKX6tw==');
            audio.play().catch(() => {
                // Ignore audio errors in case autoplay is blocked
            });
        } catch (error) {
            // Ignore audio errors
        }
    }, []);

    // Enhanced feedback system with native iOS haptics and regional colors
    const provideScanFeedback = useCallback((type, message, analysis = null) => {
        console.log(`🍎 iOS Scanner Feedback [${type}]:`, message);

        let feedbackMessage = message;
        if (analysis && analysis.analysis) {
            feedbackMessage = `${message} (${analysis.analysis.format}${analysis.analysis.country ? ` - ${analysis.analysis.country}` : ''})`;
        }

        setScanFeedback(feedbackMessage);
        setBarcodeAnalysis(analysis);

        // ADD THIS: Native iOS haptic feedback integration
        const triggerHapticFeedback = async () => {
            try {
                // Import haptics dynamically to avoid import issues
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

        // Trigger haptic feedback
        triggerHapticFeedback();

        // Visual feedback with regional colors (EXISTING CODE - KEEP AS IS)
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

        // Audio feedback for success (EXISTING CODE - KEEP AS IS)
        if (type === 'success') {
            playBeepSound();
        }

        // Clear feedback after delay (EXISTING CODE - KEEP AS IS)
        setTimeout(() => {
            if (mountedRef.current) {
                setScanFeedback('');
                setBarcodeAnalysis(null);
            }
        }, 4000);
    }, [playBeepSound]);

    // FIXED: Capacitor scanner function with proper web camera permission handling
    const startCapacitorScan = useCallback(async () => {
        if (!capacitorBarcodeScanner) {
            provideScanFeedback('error', 'Camera scanner not available');
            setIsScanning(false);
            return;
        }

        try {
            console.log('Starting Capacitor barcode scan...');
            setIsScanning(true);
            setError(null);
            setScanFeedback('Requesting camera access...');

            // FIXED: Stop any existing scan first
            try {
                await capacitorBarcodeScanner.stopScan();
                console.log('Stopped any existing scans');
            } catch (stopError) {
                console.log('No active scan to stop');
            }

            // FIXED: For web/iOS Safari, manually request camera permission first
            if (!window.Capacitor?.isNativePlatform) {
                console.log('Web context detected - requesting camera permission via browser API');
                try {
                    // Request camera access through browser API first
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });

                    // Stop the stream immediately - we just needed permission
                    stream.getTracks().forEach(track => track.stop());
                    console.log('Browser camera permission granted');
                    setScanFeedback('Camera access granted - opening scanner...');

                } catch (permissionError) {
                    console.error('Browser camera permission denied:', permissionError);
                    provideScanFeedback('error', 'Camera permission denied. Please allow camera access when prompted.');
                    setIsScanning(false);
                    setError('Camera permission required. Please refresh the page and allow camera access when prompted.');
                    return;
                }
            }

            // Request permissions through Capacitor
            const permissions = await capacitorBarcodeScanner.requestPermissions();
            console.log('Capacitor permissions result:', permissions);

            if (permissions.camera !== 'granted') {
                provideScanFeedback('error', 'Camera permission denied');
                setIsScanning(false);
                setError('Camera permission denied. Please check your browser settings and allow camera access.');
                return;
            }

            setScanFeedback('Camera ready, position barcode in frame...');

            // Start scanning
            const { barcodes } = await capacitorBarcodeScanner.scan();
            console.log('Capacitor scan result:', barcodes);

            if (barcodes && barcodes.length > 0) {
                const barcode = barcodes[0];
                console.log('Barcode detected:', barcode.rawValue);

                const validation = analyzeAndValidateBarcode(barcode.rawValue);
                if (!validation.valid) {
                    provideScanFeedback('error', `Invalid barcode: ${validation.message}`);
                    setIsScanning(false);
                    return;
                }

                const cleanCode = validation.cleanCode;

                // Check for duplicates
                const sessionKey = `${sessionIdRef.current}-${cleanCode}`;
                if (processedCodesRef.current.has(sessionKey)) {
                    provideScanFeedback('warning', 'Already scanned this barcode in this session');
                    setIsScanning(false);
                    return;
                }

                processedCodesRef.current.add(sessionKey);
                provideScanFeedback('success', 'Scan successful!', validation);

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

            } else {
                console.log('No barcode found');
                provideScanFeedback('error', 'No barcode detected - please try again');
                setIsScanning(false);
            }

        } catch (error) {
            console.error('Capacitor scanning failed:', error);
            setIsScanning(false);

            // Handle user cancellation gracefully
            if (error.message && (error.message.includes('cancelled') || error.message.includes('User cancelled'))) {
                console.log('Capacitor scan cancelled by user');
                provideScanFeedback('info', 'Scan cancelled');

                // Ensure proper cleanup after cancellation
                try {
                    await capacitorBarcodeScanner.stopScan();
                    console.log('Cleanup completed after cancellation');
                } catch (cleanupError) {
                    console.log('Cleanup error (ignored):', cleanupError.message);
                }
                return;
            }

            // Other errors
            if (error.message && error.message.includes('permission')) {
                provideScanFeedback('error', 'Camera permission required');
                setError('Camera permission denied. Please refresh and allow camera access when prompted.');
            } else {
                provideScanFeedback('error', 'Scanner failed - please try again');
                setError('Scanner failed. Please check camera permissions and try again.');
            }
        }
    }, [analyzeAndValidateBarcode, onBarcodeDetected, onClose, provideScanFeedback]);


    // FIXED: Native iOS barcode scanner function with proper permission handling
    const startNativeScan = useCallback(async () => {
        if (!nativeBarcodeScanner) {
            console.log('🍎 Native scanner not available, falling back to Capacitor');
            return startCapacitorScan();
        }

        try {
            console.log('🍎 Starting native iOS AVFoundation barcode scan...');
            setIsScanning(true);
            setError(null);
            setScanFeedback('Checking camera permissions...');

            // FIXED: Check permissions and request if needed
            let permissions = await nativeBarcodeScanner.checkPermissions();
            console.log('🍎 Initial camera permissions:', permissions);

            if (permissions.camera === 'prompt' || permissions.camera === 'denied') {
                setScanFeedback('Requesting camera permission...');
                console.log('🍎 Requesting camera permissions...');
                permissions = await nativeBarcodeScanner.requestPermissions();
                console.log('🍎 Camera permissions after request:', permissions);
            }

            if (permissions.camera !== 'granted') {
                console.log('🍎 Camera permission denied:', permissions.camera);
                provideScanFeedback('error', 'Camera permission is required. Please enable camera access in Settings.');
                setIsScanning(false);
                return;
            }

            setScanFeedback('🍎 Opening native iOS camera...');

            // Start native scan with timeout
            const scanPromise = nativeBarcodeScanner.scanBarcode({
                enableHapticFeedback: true,
                enableAudioFeedback: true
            });

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Scan timeout')), 30000);
            });

            const result = await Promise.race([scanPromise, timeoutPromise]);
            console.log('🍎 Native iOS scan result:', result);

            if (result.hasContent && result.content) {
                console.log('🍎 Native iOS barcode detected:', result.content);
                provideScanFeedback('success', 'Native iOS scan successful!');

                // Use existing validation logic
                const validation = analyzeAndValidateBarcode(result.content);
                if (!validation.valid) {
                    provideScanFeedback('error', `Invalid barcode: ${validation.message}`);
                    setIsScanning(false);
                    return;
                }

                const cleanCode = validation.cleanCode;

                // Check for duplicates (using existing logic)
                const sessionKey = `${sessionIdRef.current}-${cleanCode}`;
                if (processedCodesRef.current.has(sessionKey)) {
                    provideScanFeedback('warning', 'Already scanned this barcode in this session');
                    setIsScanning(false);
                    return;
                }

                processedCodesRef.current.add(sessionKey);
                provideScanFeedback('success', '🍎 Native iOS scan successful!', validation);

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

            } else {
                console.log('🍎 No barcode found in native result:', result);
                provideScanFeedback('error', 'No barcode detected - please try again');
                setIsScanning(false);
            }

        } catch (error) {
            console.error('Native iOS scanning failed:', error);

            // CRITICAL FIX: Always reset scanning state on any error
            setIsScanning(false);
            setError(null); // Clear any previous errors

            // Handle specific error cases
            if (error.message && (
                error.message.includes('cancelled') ||
                error.message.includes('USER_CANCELLED') ||
                error.message.includes('User cancelled')
            )) {
                console.log('Native iOS scan cancelled by user');
                provideScanFeedback('info', 'Scan cancelled');
                return;
            }

            if (error.message && error.message.includes('timeout')) {
                console.log('Native iOS scan timeout');
                provideScanFeedback('error', 'Scan timeout - please try again');
                return;
            }

            if (error.message && error.message.includes('PERMISSION_DENIED')) {
                provideScanFeedback('error', 'Camera permission required - check iOS Settings');
                setError('Camera permission denied. Please check your browser settings.');
            } else if (error.message && error.message.includes('CAMERA_ERROR')) {
                provideScanFeedback('error', 'Camera setup failed - please try again');
                setError('Camera not available. Please try again.');
            } else {
                console.log('Falling back to Capacitor scanner after native failure...');
                provideScanFeedback('error', 'Native scan failed - trying fallback scanner...');

                // Automatic fallback to Capacitor scanner
                setTimeout(async () => {
                    if (mountedRef.current && !scanInProgressRef.current) {
                        console.log('Starting Capacitor fallback...');
                        await startCapacitorScan();
                    }
                }, 1000);
                return; // Don't set error state if we're trying fallback
            }
        }
    }, [analyzeAndValidateBarcode, onBarcodeDetected, onClose, provideScanFeedback, startCapacitorScan]);

    // Choose the appropriate scanner function with proper permission handling
    const startScan = useCallback(async () => {
        // FIXED: Check if we're actually in a native app context or web context
        const isActuallyNative = platformInfo.isNative && window.Capacitor?.isNativePlatform;

        console.log('Starting scan - Environment check:', {
            useNativeScanner,
            isActuallyNative,
            hasNativeScanner: !!nativeBarcodeScanner,
            hasCapacitorScanner: !!capacitorBarcodeScanner
        });

        if (useNativeScanner && isActuallyNative && nativeBarcodeScanner) {
            console.log('Attempting native iOS scan...');
            await startNativeScan();
        } else {
            console.log('Using Capacitor scanner for web/PWA context...');
            if (capacitorBarcodeScanner) {
                await startCapacitorScan();
            } else {
                provideScanFeedback('error', 'No scanner available - camera permissions may be blocked');
                setError('Camera not available. Please check browser permissions.');
            }
        }
    }, [useNativeScanner, platformInfo, startNativeScan, startCapacitorScan, provideScanFeedback]);

    // FIXED: Scanner initialization with proper platform detection
    useEffect(() => {
        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current) {
                return;
            }

            // FIXED: Wait for platform info to be ready
            if (!platformInfo.isIOS && !platformInfo.isAndroid && !platformInfo.isPWA) {
                console.log('⏳ Waiting for platform detection...');
                return;
            }

            try {
                sessionIdRef.current = Date.now();
                processedCodesRef.current = new Set();

                setError(null);
                setScanFeedback('');

                console.log(`🚀 Starting ${useNativeScanner ? 'native iOS' : 'Capacitor'} scanner session: ${sessionIdRef.current}`);

                if (mountedRef.current) {
                    setIsInitialized(true);
                    setIsLoading(false);
                    setError(null);
                }
            } catch (error) {
                console.error('🚀 Scanner setup error:', error);
                if (mountedRef.current) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Scanner Setup Failed',
                        message: `Scanner initialization failed: ${error.message}`
                    });
                    setIsLoading(false);
                }
            }
        };

        if (isActive && mountedRef.current) {
            initializeScanner();
        }
    }, [isActive, isInitialized, platformInfo, useNativeScanner]);

    // FIXED: Cleanup function with proper Capacitor handling
    const cleanupScanner = useCallback(async () => {
        console.log(`🧹 Cleaning up scanner...`);

        setIsScanning(false);
        scanInProgressRef.current = false;

        // FIXED: Properly stop Capacitor scanner if active
        if (capacitorBarcodeScanner && isScanning) {
            try {
                await capacitorBarcodeScanner.stopScan();
                console.log('✅ Capacitor scanner stopped');
            } catch (error) {
                console.log('⚠️ Capacitor cleanup error (ignored):', error.message);
            }
        }

        // Reset states
        setError(null);
        setScanFeedback('');
        setBarcodeAnalysis(null);

        console.log('✅ Scanner cleanup completed');
    }, [isScanning]);

    // FIXED: Handle scanner close with proper cleanup
    const handleScannerClose = useCallback(async () => {
        console.log('🚫 Scanner close requested');

        // ADD THIS: Haptic feedback for modal close
        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.modalClose();
        } catch (error) {
            console.log('Close haptic failed:', error);
        }

        await cleanupScanner();

        setTimeout(() => {
            if (mountedRef.current && onClose) {
                onClose();
            }
        }, 200);
    }, [cleanupScanner, onClose]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            cleanupScanner();
        };
    }, [cleanupScanner]);

    if (!isActive) {
        return null;
    }

    return (
        <FeatureGate
            feature={FEATURE_GATES.UPC_SCANNING}
            fallback={
                <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                    <div className="bg-white rounded-lg p-6 mx-4 max-w-sm">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Scanner Limit Reached
                            </h3>
                            <p className="text-gray-600 mb-4">
                                You've reached your monthly scanning limit.
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
            {/* Mobile Interface */}
            <div className="fixed inset-0 bg-black z-50 flex flex-col" ref={scannerContainerRef}>
                {/* Enhanced Header */}
                <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">
                            {useNativeScanner ? '🍎 Native iOS Scanner' : '📱 Mobile Scanner'}
                        </h3>
                        <div className="text-sm text-gray-300 mt-1">
                            {scanFeedback || `${useNativeScanner ? 'Native AVFoundation' : 'Capacitor'} optimized for ${userRegion} region`}
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
                    </div>

                    <TouchEnhancedButton
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // FORCE CLOSE: Always allow closing regardless of scanner state
                            console.log('Force closing scanner - resetting all states');
                            setIsScanning(false);
                            setError(null);
                            setScanFeedback('');
                            setBarcodeAnalysis(null);
                            handleScannerClose();
                        }}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                    >
                        ✕
                    </TouchEnhancedButton>
                </div>

                {error ? (
                    <div className="flex-1 flex items-center justify-center bg-red-900">
                        <div className="text-center text-white px-6">
                            <div className="text-2xl mb-4">⚠️</div>
                            <h3 className="text-xl font-bold mb-2">Scanner Error</h3>
                            <p className="text-red-200 mb-4">{error}</p>
                            <p className="text-red-100 mb-6 text-sm">
                                Camera permission may be denied in your browser settings.
                                You can still close this scanner and enter UPC codes manually.
                            </p>
                            <div className="space-y-3">
                                <TouchEnhancedButton
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setError(null);
                                        setIsScanning(false);
                                        setScanFeedback('');
                                    }}
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-medium"
                                >
                                    Try Again
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsScanning(false);
                                        setError(null);
                                        setScanFeedback('');
                                        setBarcodeAnalysis(null);
                                        handleScannerClose();
                                    }}
                                    className="w-full bg-red-700 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium"
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
                                        Starting {useNativeScanner ? 'native iOS' : 'mobile'} scanner...
                                    </div>
                                    <div className="text-sm mt-2 opacity-75">
                                        {useNativeScanner ? 'Native AVFoundation' : 'Capacitor Plugin'} • Enhanced for {userRegion} products
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Enhanced Scanner Interface */}
                        {!isLoading && (
                            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                                <div className="text-center text-white px-6">
                                    <div className="mb-8">
                                        <div className="w-32 h-32 mx-auto mb-6 border-4 border-white rounded-2xl flex items-center justify-center">
                                            <span className="text-6xl">
                                                {useNativeScanner ? '🍎' : '📱'}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl font-bold mb-2">
                                            {useNativeScanner ? 'Native iOS Scanner Ready' : 'Mobile Scanner Ready'}
                                        </h2>
                                        <p className="text-gray-300 text-lg mb-4">
                                            {useNativeScanner
                                                ? 'Native AVFoundation barcode scanning with iOS optimization'
                                                : 'Capacitor barcode scanning with mobile optimization'
                                            }
                                        </p>
                                        <p className="text-sm text-blue-300 mt-2">
                                            Optimized for {userRegion} region • Enhanced accuracy
                                        </p>
                                    </div>

                                    <TouchEnhancedButton
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            startScan();
                                        }}
                                        disabled={isScanning}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                                    >
                                        {isScanning
                                            ? 'Scanning...'
                                            : `Start ${useNativeScanner ? 'Native iOS' : 'Mobile'} Scan`
                                        }
                                    </TouchEnhancedButton>

                                    {isScanning && (
                                        <div className="mt-4 text-sm text-gray-300">
                                            The camera will open automatically...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex-shrink-0 bg-black px-4 py-3">
                            <TouchEnhancedButton
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // FORCE CLOSE: Always allow closing regardless of scanner state
                                    console.log('Force closing scanner via footer - resetting all states');
                                    setIsScanning(false);
                                    setError(null);
                                    setScanFeedback('');
                                    setBarcodeAnalysis(null);
                                    scanInProgressRef.current = false;
                                    handleScannerClose();
                                }}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg text-lg font-medium"
                            >
                                {isScanning ? 'Force Close' : 'Close'}
                            </TouchEnhancedButton>
                        </div>
                    </>
                )}
            </div>
        </FeatureGate>
    );
}