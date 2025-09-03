'use client';
// file: /src/components/inventory/BarcodeScannerIOS.js v15 - Clean MLKit with full international support

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
    const [scanFeedback, setScanFeedback] = useState('');
    const [permissionState, setPermissionState] = useState('unknown');

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
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);

    // Enhanced international barcode format detection with comprehensive GS1 prefixes
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

    // Get regional hints and warnings for international context
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

    // Enhanced international barcode validation with comprehensive analysis
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

    // Load user region and usage info with comprehensive currency mapping
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

    // Enhanced feedback system with international context
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

        // Clear feedback after delay
        setTimeout(() => {
            if (mountedRef.current) {
                setScanFeedback('');
                setBarcodeAnalysis(null);
            }
        }, 4000); // Longer timeout for international context
    }, []);

    // Process barcode result with enhanced international analysis
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

        // Mark as processed
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

    // Enhanced MLKit implementation with comprehensive international format support
    const startMLKitScanning = useCallback(async () => {
        try {
            console.log('MLKit iOS: Starting enhanced international barcode scanner...');

            // Request permissions if needed
            if (Capacitor.isNativePlatform()) {
                const { camera } = await MLKitBarcodeScanner.requestPermissions();
                if (camera !== 'granted') {
                    setError('Camera permission denied');
                    return;
                }
            }

            // Configure and start scan with comprehensive format support
            const result = await MLKitBarcodeScanner.scan({
                formats: [
                    'UPC_A', 'UPC_E', 'EAN_8', 'EAN_13',
                    'CODE_128', 'CODE_39', 'CODE_93',
                    'CODABAR', 'ITF', 'DATA_MATRIX', 'QR_CODE'
                ],
                lensFacing: 'back'
            });

            if (result.barcodes && result.barcodes.length > 0) {
                const barcode = result.barcodes[0];
                console.log('MLKit iOS: Barcode detected', {
                    value: barcode.rawValue,
                    format: barcode.format
                });

                // Process the barcode result using enhanced international analysis
                processBarcodeResult(barcode.rawValue);
            } else {
                provideScanFeedback('error', 'No barcode detected');
            }
        } catch (error) {
            console.error('MLKit iOS: Scan error', error);
            if (!error.message.includes('cancelled') && !error.message.includes('User cancelled')) {
                provideScanFeedback('error', 'Enhanced international scanning failed');
            }
        }
    }, [processBarcodeResult, provideScanFeedback]);

    // Initialize scanner
    useEffect(() => {
        if (isActive && !isInitialized && mountedRef.current) {
            sessionIdRef.current = Date.now();
            processedCodesRef.current = new Set();
            setIsInitialized(true);
            setIsLoading(false);
            loadUserRegion();
            loadUsageInfo();
        }
    }, [isActive, isInitialized, loadUserRegion, loadUsageInfo]);

    // Cleanup
    const cleanupScanner = useCallback(() => {
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
    }, []);

    const handleScannerClose = useCallback(() => {
        cleanupScanner();
        setTimeout(() => {
            if (mountedRef.current && onClose) {
                onClose();
            }
        }, 100);
    }, [cleanupScanner, onClose]);

    const retryScanner = useCallback(() => {
        setError(null);
        setIsLoading(true);
        cleanupScanner();
        setTimeout(() => setIsInitialized(false), 300);
    }, [cleanupScanner]);

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
            {/* FULL-SCREEN MODAL - Covers entire viewport with no background bleed-through */}
            <div
                className="fixed inset-0 bg-black z-[9999] flex flex-col"
                style={{
                    // Ensure complete coverage on all iOS devices
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    width: '100vw',
                    height: '100vh',
                    zIndex: 9999,
                    // Prevent any scrolling or interaction with background
                    overscrollBehavior: 'none',
                    touchAction: 'none',
                    // iOS specific fixes
                    WebkitOverflowScrolling: 'touch',
                    WebkitTransform: 'translateZ(0)'
                }}
            >
                {/* Enhanced Header with International Context */}
                <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                    <div className="flex-1">
                        <h3 className="text-lg font-medium">MLKit International Scanner</h3>
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
                                    'Unlimited scans'
                                ) : (
                                    `${usageInfo.remaining} scans remaining`
                                )}
                            </div>
                        )}
                    </div>

                    <TouchEnhancedButton
                        onClick={handleScannerClose}
                        className="text-white text-2xl font-bold w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700 flex-shrink-0 ml-4"
                        style={{ minWidth: '40px', minHeight: '40px' }}
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {/* Main Content */}
                <div className="flex-1 relative bg-black overflow-hidden" ref={scannerContainerRef}>
                    {/* Error Display */}
                    {error ? (
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <div className="bg-white rounded-lg p-6 text-center max-w-sm mx-auto">
                                <div className="text-red-600 mb-4 text-2xl">⚠️</div>
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
                            {/* Always show content - either loading or ready interface */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                                {isLoading ? (
                                    /* Loading State */
                                    <div className="text-center text-white px-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                        <div className="text-lg font-medium mb-2">
                                            Starting international scanner...
                                        </div>
                                        <div className="text-sm opacity-75">
                                            Enhanced for {userRegion} products • Powered by MLKit
                                        </div>
                                    </div>
                                ) : (
                                    /* Scanner Ready Interface */
                                    <div className="text-center text-white px-6 max-w-md mx-auto">
                                        <div className="mb-8">
                                            {/* Enhanced Icon Design with International Theme */}
                                            <div
                                                className="w-40 h-40 mx-auto mb-6 border-4 border-white rounded-2xl flex items-center justify-center"
                                                style={{
                                                    borderColor: '#3B82F6',
                                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                    boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
                                                }}
                                            >
                                                <span className="text-8xl">🌍</span>
                                            </div>

                                            {/* International Scanner Messaging */}
                                            <h2 className="text-3xl font-bold mb-4">International Scanner Ready</h2>
                                            <p className="text-gray-300 text-lg mb-2">
                                                Enhanced barcode scanning with global product support
                                            </p>
                                            <p className="text-sm text-blue-300 mb-2">
                                                Optimized for {userRegion} region • Supports 40+ countries
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Comprehensive GS1 prefix support with regional hints
                                            </p>
                                        </div>

                                        {/* Enhanced Scan Button */}
                                        <TouchEnhancedButton
                                            onClick={startMLKitScanning}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg w-full max-w-xs mb-4"
                                            style={{ minHeight: '60px', fontSize: '18px' }}
                                        >
                                            📸 Start International Scan
                                        </TouchEnhancedButton>

                                        <div className="text-xs text-gray-500 text-center max-w-xs mx-auto">
                                            Supports UPC, EAN, Code 128/39/93, ITF, Data Matrix, QR codes from 40+ countries
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 bg-black px-4 py-3">
                    <TouchEnhancedButton
                        onClick={handleScannerClose}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg text-lg font-medium"
                    >
                        Close
                    </TouchEnhancedButton>
                </div>
            </div>
        </FeatureGate>
    );
}