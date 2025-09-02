'use client';
// file: /src/components/inventory/BarcodeScannerIOS.js v13 - Android-style UI redesign for iOS

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
    const [barcodeAnalysis, setBarcodeAnalysis] = useState(null);
    const [userRegion, setUserRegion] = useState('US');
    const [permissionState, setPermissionState] = useState('unknown');

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

    // Enhanced barcode analysis
    const analyzeAndValidateBarcode = useCallback((code) => {
        let cleanCode = code.replace(/\D/g, '');

        if (cleanCode.length < 6 || cleanCode.length > 14) {
            return { valid: false, reason: 'invalid_length', message: `Invalid length: ${cleanCode.length}` };
        }

        const analysis = detectBarcodeFormat(cleanCode);
        if (analysis.format === 'UNKNOWN') {
            return { valid: false, reason: 'unknown_format', message: 'Unknown format' };
        }

        if (cleanCode.length === 11 && analysis.format === 'UPC-A') {
            cleanCode = '0' + cleanCode;
        } else if (cleanCode.length >= 6 && cleanCode.length <= 10) {
            cleanCode = cleanCode.padStart(12, '0');
        }

        if (cleanCode.match(/^0+$/) || cleanCode.match(/^(.)\1{9,}$/)) {
            return { valid: false, reason: 'invalid_pattern', message: 'Invalid pattern' };
        }

        return { valid: true, cleanCode, analysis, message: `Valid ${analysis.format} from ${analysis.country}` };
    }, [detectBarcodeFormat]);

    // Load user region
    const loadUserRegion = useCallback(async () => {
        try {
            const response = await apiGet('/api/user/profile');
            if (response.ok) {
                const data = await response.json();
                const currency = data.user?.currencyPreferences?.currency || 'USD';
                const currencyToRegion = {
                    'USD': 'US', 'GBP': 'UK', 'EUR': 'EU', 'CAD': 'CA',
                    'AUD': 'AU', 'JPY': 'JP', 'CNY': 'CN'
                };
                setUserRegion(currencyToRegion[currency] || 'US');
            }
        } catch (error) {
            console.error('Failed to load user region:', error);
        }
    }, []);

    // Initialize
    useEffect(() => {
        if (isActive && !isInitialized && mountedRef.current) {
            sessionIdRef.current = Date.now();
            processedCodesRef.current = new Set();
            setIsInitialized(true);
            setIsLoading(false);
            loadUserRegion();
        }
    }, [isActive, isInitialized, loadUserRegion]);

    // Load usage info
    const loadUsageInfo = useCallback(async () => {
        try {
            const response = await apiGet('/api/upc/usage');
            if (response.ok) {
                setUsageInfo(await response.json());
            }
        } catch (error) {
            console.log('Could not load usage info:', error);
        }
    }, []);

    useEffect(() => {
        if (isActive) loadUsageInfo();
    }, [isActive, loadUsageInfo]);

    // Haptic and audio feedback
    const provideNativeHapticFeedback = useCallback(async (type) => {
        try {
            switch (type) {
                case 'success': await MobileHaptics.scanSuccess(); break;
                case 'error': await MobileHaptics.scanError(); break;
                default: await MobileHaptics.light(); break;
            }
        } catch (error) {
            console.log('Haptic feedback failed:', error);
        }
    }, []);

    const playBeepSound = useCallback(() => {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmASBSuB0PHdhzUIG2K99+SYHAYLTKX6tw==');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        } catch (error) {}
    }, []);

    // Enhanced feedback system
    const provideScanFeedback = useCallback((type, message, analysis = null) => {
        let feedbackMessage = message;
        if (analysis?.analysis) {
            feedbackMessage = `${message} (${analysis.analysis.format} - ${analysis.analysis.country})`;
        }

        setScanFeedback(feedbackMessage);
        setBarcodeAnalysis(analysis);

        if (type === 'success') {
            provideNativeHapticFeedback('success');
            playBeepSound();
        } else if (type === 'error') {
            provideNativeHapticFeedback('error');
        } else {
            provideNativeHapticFeedback('light');
        }

        // Enhanced visual feedback
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

        setTimeout(() => {
            if (mountedRef.current) {
                setScanFeedback('');
                setBarcodeAnalysis(null);
            }
        }, 3000);
    }, [provideNativeHapticFeedback, playBeepSound]);

    // Process barcode result
    const processBarcodeResult = useCallback((code) => {
        const now = Date.now();
        if (scanInProgressRef.current || (now - lastScanTimeRef.current) < 1500) {
            return false;
        }

        const validation = analyzeAndValidateBarcode(code);
        if (!validation.valid) {
            provideScanFeedback('error', validation.message);
            return false;
        }

        const cleanCode = validation.cleanCode;
        const sessionKey = `${sessionIdRef.current}-${cleanCode}`;
        if (processedCodesRef.current.has(sessionKey)) {
            provideScanFeedback('warning', 'Already scanned');
            return false;
        }

        processedCodesRef.current.add(sessionKey);
        scanInProgressRef.current = true;
        lastScanTimeRef.current = now;

        provideScanFeedback('success', 'Barcode scanned successfully!', validation);

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

    // MLKit scanning
    const startMLKitScanning = useCallback(async () => {
        try {
            provideScanFeedback('processing', `Opening scanner for ${userRegion}...`);

            const { barcodes } = await MLKitBarcodeScanner.scan({
                formats: ['UPC_A', 'UPC_E', 'EAN_8', 'EAN_13', 'CODE_128', 'CODE_39', 'CODE_93'],
                lensFacing: 'back'
            });

            if (barcodes && barcodes.length > 0) {
                const barcode = barcodes[0];
                processBarcodeResult(barcode.rawValue);
            } else {
                provideScanFeedback('error', 'No barcode detected');
            }
        } catch (error) {
            if (!error.message.includes('cancelled')) {
                provideScanFeedback('error', 'Scanning failed');
            }
        }
    }, [provideScanFeedback, processBarcodeResult, userRegion]);

    // Cleanup
    const cleanupScanner = useCallback(async () => {
        setIsScanning(false);
        scanInProgressRef.current = false;
        setError(null);
        setScanFeedback('');
        setBarcodeAnalysis(null);
    }, []);

    const handleScannerClose = useCallback(async () => {
        try {
            await MobileHaptics.modalClose();
        } catch (error) {}

        await cleanupScanner();
        setTimeout(() => {
            if (mountedRef.current && onClose) {
                onClose();
            }
        }, 100);
    }, [cleanupScanner, onClose]);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            cleanupScanner();
        };
    }, [cleanupScanner]);

    if (!isActive) return null;

    return (
        <FeatureGate
            feature={FEATURE_GATES.UPC_SCANNING}
            fallback={
                <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                    <div className="bg-white rounded-lg p-6 mx-4 max-w-sm">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Scanning Limit Reached</h3>
                            <p className="text-gray-600 mb-4">You've reached your monthly scanning limit.</p>
                            <div className="text-sm text-gray-500 mb-4">
                                <UsageLimitDisplay feature={FEATURE_GATES.UPC_SCANNING} label="Remaining scans" />
                            </div>
                            <div className="space-y-3">
                                <TouchEnhancedButton
                                    onClick={() => NativeNavigation.navigateTo({ path: '/pricing?source=upc-limit' })}
                                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium"
                                >
                                    Upgrade Plan
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={onClose}
                                    className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-lg"
                                >
                                    Close
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            {/* Android-Style iOS Scanner Interface */}
            <div className="fixed inset-0 bg-black z-[100] flex flex-col" ref={scannerContainerRef}>

                {/* Top Status Bar - Android Style */}
                <div className="flex-shrink-0 bg-black bg-opacity-95 pt-12 pb-4 px-4 backdrop-blur-sm border-b border-white border-opacity-10">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <TouchEnhancedButton
                                onClick={handleScannerClose}
                                className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center backdrop-blur-sm border border-white border-opacity-30"
                            >
                                <span className="text-white text-lg font-light">✕</span>
                            </TouchEnhancedButton>

                            <div>
                                <h1 className="text-white text-lg font-semibold">International Scanner</h1>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                    <span className="text-green-300 text-sm">MLKit Enhanced</span>
                                </div>
                                {usageInfo && (
                                    <p className="text-gray-400 text-xs">
                                        {usageInfo.monthlyLimit === 'unlimited' ? 'Unlimited' : `${usageInfo.remaining} remaining`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Barcode analysis display */}
                    {barcodeAnalysis && (
                        <div className="mt-3 bg-black bg-opacity-60 rounded-lg p-3 backdrop-blur-sm border border-white border-opacity-20">
                            <div className="text-xs text-blue-300">
                                {barcodeAnalysis.message}
                                {barcodeAnalysis.regionalHints && barcodeAnalysis.regionalHints.length > 0 && (
                                    <div className="mt-1 space-y-1">
                                        {barcodeAnalysis.regionalHints.map((hint, i) => (
                                            <div key={i} className={`text-xs ${
                                                hint.type === 'warning' ? 'text-orange-300' : 'text-blue-300'
                                            }`}>
                                                {hint.message}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {error ? (
                    // Error State
                    <div className="flex-1 flex items-center justify-center px-8 bg-black">
                        <div className="text-center">
                            <div className="w-24 h-24 bg-red-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-red-400 border-opacity-30">
                                <span className="text-red-400 text-3xl">⚠</span>
                            </div>
                            <h2 className="text-white text-xl font-semibold mb-2">Camera Unavailable</h2>
                            <p className="text-gray-300 text-base mb-8">{error}</p>
                            <div className="space-y-4">
                                <TouchEnhancedButton
                                    onClick={() => {
                                        setError(null);
                                        setIsScanning(false);
                                        setScanFeedback('');
                                        scanInProgressRef.current = false;
                                    }}
                                    className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl text-lg font-medium"
                                >
                                    Try Again
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={handleScannerClose}
                                    className="w-full bg-white bg-opacity-20 text-white py-3 px-6 rounded-xl"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Loading State - Android Style */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
                                <div className="text-center text-white">
                                    <div className="relative mb-6">
                                        <div className="w-16 h-16 border-4 border-blue-500 border-opacity-20 rounded-full animate-spin mx-auto">
                                            <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-blue-500 rounded-full"></div>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-2xl">🌍</span>
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-semibold mb-2">Preparing Scanner</h2>
                                    <p className="text-gray-400">International support for {userRegion}</p>
                                </div>
                            </div>
                        )}

                        {/* Android-Style Scanner Interface */}
                        {!isLoading && (
                            <>
                                {/* Camera View Simulation */}
                                <div className="flex-1 relative bg-black overflow-hidden">
                                    {/* Camera Background with Grid */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-black">
                                        <div className="absolute inset-0 opacity-10">
                                            <div className="grid grid-cols-3 grid-rows-3 h-full w-full">
                                                {Array.from({length: 9}).map((_, i) => (
                                                    <div key={i} className="border border-white border-opacity-20"></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Android-Style Scanning Reticle */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="relative">
                                            {/* Large Scanning Frame */}
                                            <div className="w-80 h-48 relative">
                                                {/* Animated Corners */}
                                                <div className="absolute top-0 left-0 w-12 h-12">
                                                    <div className="w-full h-1 bg-white shadow-lg shadow-white/50 animate-pulse rounded-full"></div>
                                                    <div className="w-1 h-full bg-white shadow-lg shadow-white/50 animate-pulse rounded-full"></div>
                                                </div>
                                                <div className="absolute top-0 right-0 w-12 h-12">
                                                    <div className="w-full h-1 bg-white shadow-lg shadow-white/50 animate-pulse rounded-full"></div>
                                                    <div className="w-1 h-full bg-white shadow-lg shadow-white/50 ml-auto animate-pulse rounded-full"></div>
                                                </div>
                                                <div className="absolute bottom-0 left-0 w-12 h-12">
                                                    <div className="w-1 h-full bg-white shadow-lg shadow-white/50 animate-pulse rounded-full"></div>
                                                    <div className="w-full h-1 bg-white shadow-lg shadow-white/50 mt-auto animate-pulse rounded-full"></div>
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-12 h-12">
                                                    <div className="w-1 h-full bg-white shadow-lg shadow-white/50 ml-auto animate-pulse rounded-full"></div>
                                                    <div className="w-full h-1 bg-white shadow-lg shadow-white/50 mt-auto animate-pulse rounded-full"></div>
                                                </div>

                                                {/* Scanning Line Animation */}
                                                {(isScanning || scanInProgressRef.current) && (
                                                    <div className="absolute inset-0 flex items-center">
                                                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-lg animate-pulse"/>
                                                    </div>
                                                )}

                                                {/* Center Dot */}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-4 h-4 rounded-full bg-blue-400 shadow-lg animate-pulse"></div>
                                                </div>
                                            </div>

                                            {/* Instructions */}
                                            <div className="mt-8 text-center text-white">
                                                <h2 className="text-xl font-semibold mb-2">Position barcode in frame</h2>
                                                <p className="text-gray-300 text-base">MLKit will automatically detect and scan</p>
                                                <div className="mt-3 text-sm text-blue-300">Enhanced for {userRegion} products</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Indicator */}
                                    <div className="absolute top-20 left-0 right-0 flex justify-center">
                                        <div className={`px-4 py-2 rounded-full backdrop-blur-sm border ${
                                            isScanning || scanInProgressRef.current
                                                ? 'bg-green-500 bg-opacity-20 border-green-400 border-opacity-30'
                                                : 'bg-blue-500 bg-opacity-20 border-blue-400 border-opacity-30'
                                        }`}>
                                            <div className="flex items-center space-x-2">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    isScanning || scanInProgressRef.current ? 'bg-green-400 animate-pulse' : 'bg-blue-400'
                                                }`}></div>
                                                <span className="text-white text-sm font-medium">
                                                    {isScanning || scanInProgressRef.current ? 'Scanning Active' : 'Ready'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Scan Button */}
                                    <div className="absolute bottom-20 left-0 right-0 flex justify-center">
                                        <TouchEnhancedButton
                                            onClick={startMLKitScanning}
                                            disabled={isScanning || scanInProgressRef.current}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-full text-lg shadow-xl backdrop-blur-sm border-2 border-blue-400 border-opacity-30 disabled:opacity-50 flex items-center space-x-2"
                                        >
                                            <span className="text-2xl">📸</span>
                                            <span>{isScanning || scanInProgressRef.current ? 'Scanning...' : 'Start Scanning'}</span>
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Cancel during scan */}
                                    {(isScanning || scanInProgressRef.current) && (
                                        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                                            <TouchEnhancedButton
                                                onClick={() => {
                                                    setIsScanning(false);
                                                    scanInProgressRef.current = false;
                                                    setScanFeedback('Cancelled');
                                                }}
                                                className="bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-300 py-2 px-6 rounded-full backdrop-blur-sm border border-red-400 border-opacity-30"
                                            >
                                                Cancel
                                            </TouchEnhancedButton>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Toolbar */}
                                <div className="flex-shrink-0 bg-black bg-opacity-95 px-4 py-6 backdrop-blur-sm border-t border-white border-opacity-10">
                                    <TouchEnhancedButton
                                        onClick={handleScannerClose}
                                        className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-4 px-6 rounded-xl text-lg font-medium backdrop-blur-sm border border-white border-opacity-30"
                                    >
                                        Close Scanner
                                    </TouchEnhancedButton>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </FeatureGate>
    );
}