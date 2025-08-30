'use client';
// file: /src/components/inventory/BarcodeScannerIOS.js v6 - FIXED plugin detection and data flow

import {useEffect, useRef, useState, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {MobileHaptics} from '@/components/mobile/MobileHaptics';
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import FeatureGate, {UsageLimitDisplay} from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import { apiGet } from '@/lib/api-config';
import { PlatformDetection } from '@/utils/PlatformDetection';

// FIXED: Better plugin detection with fallback handling
let nativeBarcodeScanner = null;
let capacitorBarcodeScanner = null;
let pluginLoadAttempted = false;

// FIXED: Safer plugin initialization with better error handling
const initializeScanners = async () => {
    if (pluginLoadAttempted) return;
    pluginLoadAttempted = true;

    try {
        // Try to import native iOS scanner
        const nativeModule = await import('@/plugins/native-barcode-scanner');

        // FIXED: Verify the plugin actually works before using it
        if (nativeModule.isNativeScannerAvailable && await nativeModule.isNativeScannerAvailable()) {
            nativeBarcodeScanner = {
                checkPermissions: nativeModule.checkPermissions,
                requestPermissions: nativeModule.requestPermissions,
                scanBarcode: nativeModule.scanBarcode,
                isNativeScannerAvailable: nativeModule.isNativeScannerAvailable
            };
            console.log('✅ Native iOS scanner verified and loaded');
        } else {
            console.log('❌ Native scanner imported but not functional');
            nativeBarcodeScanner = null;
        }
    } catch (error) {
        console.log('❌ Native iOS scanner not available:', error.message);
        nativeBarcodeScanner = null;
    }

    try {
        // Try to import Capacitor scanner
        const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
        capacitorBarcodeScanner = BarcodeScanner;
        console.log('✅ Capacitor barcode scanner loaded');
    } catch (error) {
        console.log('❌ Capacitor barcode scanner not available:', error.message);
        capacitorBarcodeScanner = null;
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

    // Enhanced barcode analysis state with debugging
    const [barcodeAnalysis, setBarcodeAnalysis] = useState(null);
    const [userRegion, setUserRegion] = useState('US');
    const [debugInfo, setDebugInfo] = useState([]);
    const [showDebug, setShowDebug] = useState(false);

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

    // FIXED: Better platform detection and plugin verification
    useEffect(() => {
        const initializePlatformInfo = async () => {
            console.log('🔍 Initializing platform detection...');

            const detectedInfo = {
                isIOS: PlatformDetection.isIOS(),
                isAndroid: PlatformDetection.isAndroid(),
                isNative: PlatformDetection.isRunningInMobileApp(),
                isPWA: PlatformDetection.isPWAInstalled(),
                userAgent: navigator.userAgent
            };

            console.log('📱 Platform detected:', detectedInfo);
            setPlatformInfo(detectedInfo);

            // Initialize scanner modules
            await initializeScanners();

            // FIXED: More thorough check for native scanner availability
            let shouldUseNative = false;
            if (detectedInfo.isIOS && detectedInfo.isNative && nativeBarcodeScanner !== null) {
                try {
                    // Test if the native scanner actually works
                    const isAvailable = await nativeBarcodeScanner.isNativeScannerAvailable();
                    shouldUseNative = isAvailable === true;
                    console.log(`🔧 Native scanner availability test: ${shouldUseNative}`);
                } catch (testError) {
                    console.log('🔧 Native scanner test failed:', testError.message);
                    shouldUseNative = false;
                }
            }

            setUseNativeScanner(shouldUseNative);

            console.log(`🔧 Final scanner selection: ${shouldUseNative ? 'Native iOS AVFoundation' : 'Capacitor fallback'}`);
        };

        initializePlatformInfo();
    }, []);

    // Helper function to add debug information
    const addDebugInfo = useCallback((message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        const debugEntry = {
            timestamp,
            message,
            data: data ? JSON.stringify(data, null, 2) : null
        };

        setDebugInfo(prev => [...prev.slice(-15), debugEntry]);
        console.log(`DEBUG [${timestamp}]:`, message, data);
    }, []);

    // Load usage information
    const loadUsageInfo = useCallback(async () => {
        try {
            addDebugInfo('Loading usage info from API endpoint');
            const response = await apiGet('/api/upc/usage');
            if (response.ok) {
                const data = await response.json();
                setUsageInfo(data);
                addDebugInfo('Usage info loaded successfully', data);
            } else {
                addDebugInfo('Usage API failed', { status: response.status, statusText: response.statusText });
            }
        } catch (error) {
            addDebugInfo('Usage loading error', { error: error.message, stack: error.stack });
            console.log('Could not load usage info:', error);
        }
    }, [addDebugInfo]);

    useEffect(() => {
        loadUsageInfo();
    }, [loadUsageInfo]);

    // Keep existing barcode validation functions
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

    const analyzeAndValidateBarcode = useCallback((code) => {
        let cleanCode = code.replace(/\D/g, '');
        console.log(`📊 Analyzing barcode: "${code}" -> "${cleanCode}"`);

        if (cleanCode.length < 6 || cleanCode.length > 14) {
            return {
                valid: false,
                reason: 'invalid_length',
                message: `Barcode length ${cleanCode.length} is outside valid range (6-14 digits)`
            };
        }

        const analysis = detectBarcodeFormat(cleanCode);
        console.log(`📊 Barcode analysis:`, analysis);

        if (analysis.format === 'UNKNOWN') {
            return {
                valid: false,
                reason: 'unknown_format',
                message: 'Unknown barcode format'
            };
        }

        if (cleanCode.length === 11 && analysis.format === 'UPC-A') {
            cleanCode = '0' + cleanCode;
            console.log(`📊 Padded 11-digit UPC to UPC-A: ${cleanCode}`);
        } else if (cleanCode.length >= 6 && cleanCode.length <= 10) {
            const originalLength = cleanCode.length;
            cleanCode = cleanCode.padStart(12, '0');
            console.log(`📊 Padded ${originalLength}-digit code to standard UPC: ${cleanCode}`);
        }

        if (cleanCode.match(/^0+$/) || cleanCode.match(/^(.)\1{9,}$/)) {
            return {
                valid: false,
                reason: 'invalid_pattern',
                message: 'Invalid barcode pattern detected'
            };
        }

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
            audio.play().catch(() => {});
        } catch (error) {}
    }, []);

    // Enhanced feedback system
    const provideScanFeedback = useCallback((type, message, analysis = null) => {
        console.log(`📢 Scanner Feedback [${type}]:`, message);

        let feedbackMessage = message;
        if (analysis && analysis.analysis) {
            feedbackMessage = `${message} (${analysis.analysis.format}${analysis.analysis.country ? ` - ${analysis.analysis.country}` : ''})`;
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

        // Visual feedback
        if (scannerContainerRef.current && mountedRef.current) {
            let color = '#10B981';

            if (type === 'success') {
                if (analysis?.analysis?.region === 'UK') color = '#3B82F6';
                else if (analysis?.analysis?.region === 'EU') color = '#8B5CF6';
                else if (analysis?.analysis?.region === 'US') color = '#10B981';
            } else if (type === 'processing') {
                color = '#F59E0B';
            } else {
                color = '#EF4444';
            }

            scannerContainerRef.current.style.backgroundColor = color;
            scannerContainerRef.current.style.transition = 'background-color 0.3s';

            setTimeout(() => {
                if (scannerContainerRef.current && mountedRef.current) {
                    scannerContainerRef.current.style.backgroundColor = '';
                }
            }, 500);
        }

        if (type === 'success') {
            playBeepSound();
        }

        setTimeout(() => {
            if (mountedRef.current) {
                setScanFeedback('');
                setBarcodeAnalysis(null);
            }
        }, 4000);
    }, [playBeepSound]);

    // FIXED: Improved Capacitor scanner with better state management
    const startCapacitorScan = useCallback(async () => {
        if (!capacitorBarcodeScanner) {
            provideScanFeedback('error', 'Camera scanner not available');
            setIsScanning(false);
            return;
        }

        try {
            addDebugInfo('Starting Capacitor barcode scan');
            console.log('📱 Starting Capacitor barcode scan...');
            setIsScanning(true);
            setError(null);
            setScanFeedback('Requesting camera access...');

            // Stop any existing scan first
            try {
                await capacitorBarcodeScanner.stopScan();
                addDebugInfo('Stopped any existing scans');
            } catch (stopError) {
                addDebugInfo('No active scan to stop');
            }

            // Request permissions
            const permissions = await capacitorBarcodeScanner.requestPermissions();
            addDebugInfo('Capacitor permissions result', permissions);

            if (permissions.camera !== 'granted') {
                provideScanFeedback('error', 'Camera permission denied');
                setIsScanning(false);
                setError('Camera permission denied. Please check your browser settings and allow camera access.');
                return;
            }

            setScanFeedback('Camera ready, position barcode in frame...');

            // Start scanning
            const { barcodes } = await capacitorBarcodeScanner.scan();
            addDebugInfo('Capacitor scan result', barcodes);

            if (barcodes && barcodes.length > 0) {
                const barcode = barcodes[0];
                addDebugInfo('Barcode detected via Capacitor', { value: barcode.rawValue, format: barcode.format });

                const validation = analyzeAndValidateBarcode(barcode.rawValue);
                if (!validation.valid) {
                    provideScanFeedback('error', `Invalid barcode: ${validation.message}`);
                    setIsScanning(false);
                    return;
                }

                const cleanCode = validation.cleanCode;
                addDebugInfo('Processing successful barcode', { cleanCode });

                // Check for duplicates
                const sessionKey = `${sessionIdRef.current}-${cleanCode}`;
                if (processedCodesRef.current.has(sessionKey)) {
                    provideScanFeedback('warning', 'Already scanned this barcode in this session');
                    setIsScanning(false);
                    return;
                }

                processedCodesRef.current.add(sessionKey);
                provideScanFeedback('success', 'Capacitor scan successful!', validation);

                // FIXED: Ensure proper data flow back to parent
                addDebugInfo('CRITICAL: Calling onBarcodeDetected', { cleanCode });

                setTimeout(() => {
                    if (mountedRef.current) {
                        try {
                            addDebugInfo('Executing onBarcodeDetected callback');
                            onBarcodeDetected(cleanCode);

                            // FIXED: Add longer delay before closing to ensure data is processed
                            setTimeout(() => {
                                if (mountedRef.current && onClose) {
                                    addDebugInfo('Closing scanner after successful scan');
                                    onClose();
                                }
                            }, 1000); // Increased delay
                        } catch (callbackError) {
                            addDebugInfo('Error calling onBarcodeDetected', { error: callbackError.message });
                            console.error('Error calling onBarcodeDetected:', callbackError);
                        }
                    }
                }, 500);

            } else {
                addDebugInfo('No barcode found in Capacitor result');
                provideScanFeedback('error', 'No barcode detected - please try again');
                setIsScanning(false);
            }

        } catch (error) {
            addDebugInfo('Capacitor scanning error', { error: error.message, stack: error.stack });
            console.error('Capacitor scanning failed:', error);
            setIsScanning(false);

            if (error.message && (error.message.includes('cancelled') || error.message.includes('User cancelled'))) {
                addDebugInfo('Capacitor scan cancelled by user');
                provideScanFeedback('info', 'Scan cancelled');

                try {
                    await capacitorBarcodeScanner.stopScan();
                } catch (cleanupError) {
                    addDebugInfo('Cleanup error after cancellation', cleanupError.message);
                }
                return;
            }

            if (error.message && error.message.includes('permission')) {
                provideScanFeedback('error', 'Camera permission required');
                setError('Camera permission denied. Please refresh and allow camera access when prompted.');
            } else {
                provideScanFeedback('error', 'Scanner failed - please try again');
                setError('Scanner failed. Please check camera permissions and try again.');
            }
        }
    }, [analyzeAndValidateBarcode, onBarcodeDetected, onClose, provideScanFeedback, addDebugInfo]);

    // FIXED: Main scanner function with proper fallback logic
    const startScan = useCallback(async () => {
        // FIXED: Always reset state first
        setIsScanning(true);
        setError(null);
        setScanFeedback('');
        setBarcodeAnalysis(null);
        scanInProgressRef.current = true;

        addDebugInfo('=== STARTING SCAN SEQUENCE ===');
        addDebugInfo('Scanner availability check', {
            useNativeScanner,
            nativeAvailable: nativeBarcodeScanner !== null,
            capacitorAvailable: capacitorBarcodeScanner !== null
        });

        // FIXED: Check if we should use native scanner and if it's actually available
        if (useNativeScanner && nativeBarcodeScanner) {
            try {
                addDebugInfo('Attempting native iOS scan');

                // Verify native scanner is still available
                const isStillAvailable = await nativeBarcodeScanner.isNativeScannerAvailable();
                if (!isStillAvailable) {
                    addDebugInfo('Native scanner no longer available, falling back');
                    throw new Error('Native scanner not available');
                }

                setScanFeedback('Starting native iOS camera...');

                const result = await nativeBarcodeScanner.scanBarcode({
                    enableHapticFeedback: true,
                    enableAudioFeedback: true
                });

                addDebugInfo('Native scan result', result);

                if (result.hasContent && result.content) {
                    addDebugInfo('Native scan successful', { content: result.content, format: result.format });

                    const validation = analyzeAndValidateBarcode(result.content);
                    if (!validation.valid) {
                        addDebugInfo('Invalid barcode from native scan', validation);
                        provideScanFeedback('error', `Invalid barcode: ${validation.message}`);
                        setIsScanning(false);
                        scanInProgressRef.current = false;
                        return;
                    }

                    const cleanCode = validation.cleanCode;
                    addDebugInfo('Valid barcode processed', { cleanCode });

                    // Check for duplicates
                    const sessionKey = `${sessionIdRef.current}-${cleanCode}`;
                    if (processedCodesRef.current.has(sessionKey)) {
                        addDebugInfo('Duplicate barcode detected');
                        provideScanFeedback('warning', 'Already scanned this barcode in this session');
                        setIsScanning(false);
                        scanInProgressRef.current = false;
                        return;
                    }

                    processedCodesRef.current.add(sessionKey);
                    provideScanFeedback('success', 'Native iOS scan successful!', validation);

                    // FIXED: Ensure callback execution
                    addDebugInfo('CRITICAL: About to call onBarcodeDetected', { cleanCode });

                    setTimeout(() => {
                        if (mountedRef.current) {
                            try {
                                addDebugInfo('Executing onBarcodeDetected callback NOW');
                                onBarcodeDetected(cleanCode);

                                setTimeout(() => {
                                    if (mountedRef.current && onClose) {
                                        addDebugInfo('Closing scanner after native scan success');
                                        onClose();
                                    }
                                }, 1000);
                            } catch (callbackError) {
                                addDebugInfo('ERROR calling onBarcodeDetected', { error: callbackError.message });
                                console.error('Error in onBarcodeDetected:', callbackError);
                            }
                        }
                    }, 500);

                } else {
                    addDebugInfo('Native scan returned no content', result);
                    provideScanFeedback('error', 'No barcode detected - please try again');
                    setIsScanning(false);
                    scanInProgressRef.current = false;
                }

                return; // Don't fall through to Capacitor

            } catch (nativeError) {
                addDebugInfo('Native scan failed', { error: nativeError.message, stack: nativeError.stack });
                console.error('Native scan error:', nativeError);

                if (nativeError.message && nativeError.message.includes('cancelled')) {
                    addDebugInfo('Native scan cancelled by user');
                    provideScanFeedback('info', 'Scan cancelled');
                    setIsScanning(false);
                    scanInProgressRef.current = false;
                    return;
                }

                // Fall through to Capacitor scanner
                addDebugInfo('Falling back to Capacitor scanner');
                provideScanFeedback('warning', 'Native scanner failed, trying fallback...');
            }
        }

        // FIXED: Use Capacitor scanner (either as primary choice or fallback)
        addDebugInfo('Using Capacitor scanner');
        await startCapacitorScan();
        scanInProgressRef.current = false;

    }, [useNativeScanner, analyzeAndValidateBarcode, onBarcodeDetected, onClose, provideScanFeedback, addDebugInfo, startCapacitorScan]);

    // FIXED: Better scanner initialization
    useEffect(() => {
        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current) {
                return;
            }

            // Wait for platform info
            if (!platformInfo.isIOS && !platformInfo.isAndroid && !platformInfo.isPWA) {
                console.log('⏳ Waiting for platform detection...');
                return;
            }

            try {
                // FIXED: Reset session state completely
                sessionIdRef.current = Date.now();
                processedCodesRef.current = new Set();
                scanInProgressRef.current = false;

                setError(null);
                setScanFeedback('');
                setBarcodeAnalysis(null);
                setIsScanning(false);

                addDebugInfo('Scanner initialization completed', {
                    sessionId: sessionIdRef.current,
                    useNativeScanner,
                    platformInfo
                });

                if (mountedRef.current) {
                    setIsInitialized(true);
                    setIsLoading(false);
                }
            } catch (error) {
                addDebugInfo('Scanner initialization failed', { error: error.message });
                console.error('Scanner setup error:', error);
                if (mountedRef.current) {
                    setIsLoading(false);
                    setError(`Scanner setup failed: ${error.message}`);
                }
            }
        };

        if (isActive && mountedRef.current) {
            initializeScanner();
        }
    }, [isActive, isInitialized, platformInfo, useNativeScanner, addDebugInfo]);

    // Enhanced cleanup function
    const cleanupScanner = useCallback(async () => {
        addDebugInfo('=== SCANNER CLEANUP STARTED ===');

        setIsScanning(false);
        scanInProgressRef.current = false;

        if (capacitorBarcodeScanner) {
            try {
                await capacitorBarcodeScanner.stopScan();
                addDebugInfo('Capacitor scanner stopped');
            } catch (error) {
                addDebugInfo('Capacitor cleanup error', error.message);
            }
        }

        setError(null);
        setScanFeedback('');
        setBarcodeAnalysis(null);

        addDebugInfo('=== SCANNER CLEANUP COMPLETED ===');
    }, [addDebugInfo]);

    // FIXED: Better close handler
    const handleScannerClose = useCallback(async () => {
        addDebugInfo('=== SCANNER CLOSE REQUESTED ===');

        try {
            await MobileHaptics.modalClose();
        } catch (error) {
            console.log('Close haptic failed:', error);
        }

        await cleanupScanner();

        setTimeout(() => {
            if (mountedRef.current && onClose) {
                addDebugInfo('Executing onClose callback');
                onClose();
            }
        }, 200);
    }, [cleanupScanner, onClose, addDebugInfo]);

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
            <div className="fixed inset-0 bg-black z-50 flex flex-col" ref={scannerContainerRef} data-scanner-modal="true">
                {/* Enhanced Header */}
                <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">
                            {useNativeScanner ? '🍎 Native iOS Scanner' : '📱 Mobile Scanner'}
                        </h3>
                        <div className="text-sm text-gray-300 mt-1">
                            {scanFeedback || `${useNativeScanner ? 'Native AVFoundation' : 'Capacitor'} optimized for ${userRegion} region`}

                            {/* Debug Toggle */}
                            <div className="mt-2">
                                <TouchEnhancedButton
                                    onClick={() => setShowDebug(!showDebug)}
                                    className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded"
                                >
                                    {showDebug ? 'Hide Debug' : 'Show Debug Info'}
                                </TouchEnhancedButton>
                            </div>

                            {/* Debug Information Display */}
                            {showDebug && (
                                <div className="mt-3 bg-gray-800 text-gray-200 p-3 rounded text-xs max-h-48 overflow-y-auto">
                                    <div className="font-bold mb-2">Debug Information:</div>
                                    {debugInfo.slice(-8).map((entry, index) => (
                                        <div key={index} className="mb-2 border-b border-gray-700 pb-1">
                                            <div className="text-blue-300">[{entry.timestamp}] {entry.message}</div>
                                            {entry.data && (
                                                <pre className="text-gray-400 text-xs mt-1 whitespace-pre-wrap">
                                                    {entry.data}
                                                </pre>
                                            )}
                                        </div>
                                    ))}

                                    {/* Current State Display */}
                                    <div className="mt-3 pt-2 border-t border-gray-700">
                                        <div className="font-bold text-yellow-300">Current State:</div>
                                        <div>isScanning: {isScanning ? 'true' : 'false'}</div>
                                        <div>useNativeScanner: {useNativeScanner ? 'true' : 'false'}</div>
                                        <div>hasError: {error ? 'true' : 'false'}</div>
                                        <div>platformReady: {platformInfo ? 'true' : 'false'}</div>
                                        <div>nativeAvailable: {nativeBarcodeScanner ? 'true' : 'false'}</div>
                                        <div>capacitorAvailable: {capacitorBarcodeScanner ? 'true' : 'false'}</div>
                                        <div>scanInProgress: {scanInProgressRef.current ? 'true' : 'false'}</div>
                                        {platformInfo && (
                                            <div>
                                                <div>isIOS: {platformInfo.isIOS ? 'true' : 'false'}</div>
                                                <div>isNative: {platformInfo.isNative ? 'true' : 'false'}</div>
                                                <div>isPWA: {platformInfo.isPWA ? 'true' : 'false'}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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

                            addDebugInfo('FORCE CLOSE - X button clicked');

                            // Force reset all states
                            setIsScanning(false);
                            setError(null);
                            setScanFeedback('');
                            setBarcodeAnalysis(null);
                            scanInProgressRef.current = false;

                            // Force cleanup
                            cleanupScanner().catch(err => {
                                addDebugInfo('Cleanup error during force close', err);
                            });

                            // Close immediately
                            if (onClose) {
                                addDebugInfo('Calling onClose directly');
                                onClose();
                            }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md font-bold text-sm"
                        title="Force close scanner"
                    >
                        X FORCE CLOSE
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

                                        addDebugInfo('Retry button clicked - resetting error state');
                                        setError(null);
                                        setIsScanning(false);
                                        setScanFeedback('');
                                        setBarcodeAnalysis(null);
                                        scanInProgressRef.current = false;
                                    }}
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-medium"
                                >
                                    Try Again
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={handleScannerClose}
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
                                                {useNativeScanner ? '📱' : '📷'}
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

                                        {/* FIXED: Add status indicator */}
                                        <div className="mt-4 text-xs">
                                            <div className={`inline-flex items-center px-2 py-1 rounded ${
                                                isScanning ? 'bg-yellow-600' : 'bg-green-600'
                                            }`}>
                                                {isScanning ? 'Scanning in progress...' : 'Ready to scan'}
                                            </div>
                                        </div>
                                    </div>

                                    <TouchEnhancedButton
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            if (isScanning || scanInProgressRef.current) {
                                                addDebugInfo('Scan button clicked but already scanning - ignoring');
                                                return;
                                            }

                                            addDebugInfo('Start scan button clicked - initiating scan');
                                            startScan();
                                        }}
                                        disabled={isScanning || scanInProgressRef.current}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isScanning || scanInProgressRef.current
                                            ? 'Scanning...'
                                            : `Start ${useNativeScanner ? 'Native iOS' : 'Mobile'} Scan`
                                        }
                                    </TouchEnhancedButton>

                                    {(isScanning || scanInProgressRef.current) && (
                                        <div className="mt-4 text-sm text-gray-300">
                                            <div className="animate-pulse">The camera will open automatically...</div>

                                            {/* FIXED: Add manual cancel option during scan */}
                                            <TouchEnhancedButton
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();

                                                    addDebugInfo('Manual scan cancellation requested');
                                                    setIsScanning(false);
                                                    scanInProgressRef.current = false;
                                                    setScanFeedback('Scan cancelled by user');

                                                    // Stop any active scans
                                                    if (capacitorBarcodeScanner) {
                                                        capacitorBarcodeScanner.stopScan().catch(err => {
                                                            addDebugInfo('Error stopping Capacitor scan', err);
                                                        });
                                                    }
                                                }}
                                                className="mt-3 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
                                            >
                                                Cancel Scan
                                            </TouchEnhancedButton>
                                        </div>
                                    )}

                                    {/* FIXED: Add test data button for debugging */}
                                    {showDebug && (
                                        <div className="mt-6 pt-4 border-t border-gray-700">
                                            <TouchEnhancedButton
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();

                                                    addDebugInfo('TEST DATA - Simulating successful barcode scan');
                                                    const testBarcode = '012345678905'; // Test UPC

                                                    try {
                                                        addDebugInfo('Calling onBarcodeDetected with test data', { testBarcode });
                                                        onBarcodeDetected(testBarcode);

                                                        setTimeout(() => {
                                                            if (onClose) {
                                                                addDebugInfo('Closing after test data');
                                                                onClose();
                                                            }
                                                        }, 1000);
                                                    } catch (testError) {
                                                        addDebugInfo('Error with test data', { error: testError.message });
                                                    }
                                                }}
                                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
                                            >
                                                TEST: Send Sample Barcode
                                            </TouchEnhancedButton>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* FIXED: Enhanced Footer */}
                        <div className="flex-shrink-0 bg-black px-4 py-3 space-y-2">
                            <TouchEnhancedButton
                                onClick={handleScannerClose}
                                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg text-lg font-bold"
                            >
                                EMERGENCY CLOSE
                            </TouchEnhancedButton>

                            {/* FIXED: Add reset session button */}
                            <TouchEnhancedButton
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    addDebugInfo('RESET SESSION - Clearing all state');

                                    // Reset all states
                                    setIsScanning(false);
                                    setError(null);
                                    setScanFeedback('');
                                    setBarcodeAnalysis(null);
                                    scanInProgressRef.current = false;

                                    // Clear processed codes
                                    processedCodesRef.current = new Set();
                                    sessionIdRef.current = Date.now();

                                    addDebugInfo('Session reset completed', { newSessionId: sessionIdRef.current });
                                }}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm"
                            >
                                Reset Scanner Session
                            </TouchEnhancedButton>
                        </div>
                    </>
                )}
            </div>
        </FeatureGate>
    );
}