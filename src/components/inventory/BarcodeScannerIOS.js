'use client';
// file: /src/components/inventory/BarcodeScannerIOS.js v2 - Updated for @capacitor/barcode-scanner

import {useEffect, useRef, useState, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import FeatureGate, {UsageLimitDisplay} from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import { apiGet } from '@/lib/api-config';

// Import the new official Capacitor barcode scanner
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerScanResult } from '@capacitor/barcode-scanner';

export default function BarcodeScannerIOS({onBarcodeDetected, onClose, isActive}) {
    const scannerContainerRef = useRef(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [scanFeedback, setScanFeedback] = useState('');

    // Enhanced barcode analysis state
    const [barcodeAnalysis, setBarcodeAnalysis] = useState(null);
    const [userRegion, setUserRegion] = useState('US'); // Default to US

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

    // Load usage information and user preferences
    useEffect(() => {
        if (isActive) {
            loadUsageInfo();
            loadUserRegion();
        }
    }, [isActive]);

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
                console.log(`🍎 iOS user region detected: ${currencyToRegion[currency] || 'US'} (from currency: ${currency})`);
            }
        } catch (error) {
            console.error('Failed to load user region:', error);
        }
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
        }, 4000);
    }, []);

    // NEW: Official Capacitor barcode scanner function (production ready)
    const startOfficialScan = useCallback(async () => {
        try {
            console.log('🍎 Starting official Capacitor barcode scan...');
            setIsScanning(true);
            setError(null);
            setScanFeedback('Opening camera...');

            // Step 1: Check if plugin is available
            if (!CapacitorBarcodeScanner) {
                provideScanFeedback('error', 'Barcode scanner not available on this device');
                setIsScanning(false);
                return;
            }

            setScanFeedback('Camera ready, position barcode in frame...');

            // Step 2: Scan with minimal parameters
            const result = await CapacitorBarcodeScanner.scanBarcode({
                hint: 'ALL'
            });

            console.log('🍎 Official scan result:', result);

            // Check multiple possible result properties
            let scannedCode = null;
            if (result) {
                scannedCode = result.ScanResult || result.scanResult || result.content || result.text || result.value;
            }

            if (scannedCode) {
                console.log('🍎 Official barcode detected:', scannedCode);
                provideScanFeedback('success', 'Barcode captured!');

                // Use existing validation logic
                const validation = analyzeAndValidateBarcode(scannedCode);
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
                provideScanFeedback('success', 'Barcode scan successful!', validation);

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
                console.log('🍎 No barcode found in result:', result);
                provideScanFeedback('error', 'No barcode detected - please try again');
                setIsScanning(false);
            }

        } catch (error) {
            console.error('🍎 Official scanning failed:', error);

            // User-friendly error handling
            if (error.message && (error.message.includes('cancelled') || error.message.includes('User cancelled'))) {
                console.log('🍎 Official scan cancelled by user');
                provideScanFeedback('info', 'Scan cancelled');
                setIsScanning(false);
                return;
            }

            if (error.message && (error.message.includes('permission') || error.message.includes('Permission'))) {
                provideScanFeedback('error', 'Camera permission required - check iOS Settings');
            } else if (error.message && error.message.includes('invalid')) {
                provideScanFeedback('error', 'Camera setup failed - please try again');
            } else {
                provideScanFeedback('error', 'Scan failed - please try again');
            }
            setIsScanning(false);
        }
    }, [analyzeAndValidateBarcode, onBarcodeDetected, onClose, provideScanFeedback]);

    // Scanner initialization
    useEffect(() => {
        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current) {
                return;
            }

            try {
                sessionIdRef.current = Date.now();
                processedCodesRef.current = new Set();

                setError(null);
                setScanFeedback('');

                console.log(`🍎 Starting iOS official scanner session: ${sessionIdRef.current}`);

                // The official plugin handles permissions internally
                if (mountedRef.current) {
                    setIsInitialized(true);
                    setIsLoading(false);
                    setError(null);
                }
            } catch (error) {
                console.error('🍎 iOS scanner setup error:', error);
                if (mountedRef.current) {
                    setError(`iOS scanner initialization failed: ${error.message}`);
                    setIsLoading(false);
                }
            }
        };

        if (isActive && mountedRef.current) {
            initializeScanner();
        }
    }, [isActive, isInitialized]);

    // Cleanup function
    const cleanupScanner = useCallback(async () => {
        console.log('🍎 Cleaning up iOS official scanner...');

        setIsScanning(false);
        scanInProgressRef.current = false;
        setIsInitialized(false);
        setIsLoading(true);
        setError(null);
        setScanFeedback('');
        setBarcodeAnalysis(null);

        processedCodesRef.current = new Set();
        sessionIdRef.current = Date.now();
        lastScanTimeRef.current = 0;

        console.log('🍎 iOS official scanner cleanup completed');
    }, []);

    // Close handler
    const handleScannerClose = useCallback(async () => {
        console.log('🍎 iOS official scanner close requested');
        await cleanupScanner();

        setTimeout(() => {
            if (mountedRef.current && onClose) {
                onClose();
            }
        }, 200);
    }, [cleanupScanner, onClose]);

    // Retry scanner initialization
    const retryScanner = useCallback(async () => {
        console.log('🍎 Retrying iOS official scanner initialization...');

        setError(null);
        setIsLoading(true);
        setIsInitialized(false);
        setIsScanning(false);
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

    // Cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            cleanupScanner();
        };
    }, [cleanupScanner]);

    // Audio feedback
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
            console.log('🍎 iOS audio feedback not available');
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
            {/* iOS Mobile Interface */}
            <div className="fixed inset-0 bg-black z-50 flex flex-col" ref={scannerContainerRef}>
                {/* Enhanced Header with iOS Context */}
                <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">🍎 Official iOS Scanner</h3>
                        <div className="text-sm text-gray-300 mt-1">
                            {scanFeedback || `iOS-optimized for ${userRegion} region`}
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

                {/* iOS Error Display */}
                {error ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg p-6 text-center max-w-sm mx-auto">
                            <div className="text-red-600 mb-4 text-2xl">🍎📷</div>
                            <div className="text-red-600 font-medium mb-4">{error}</div>
                            <div className="text-sm text-gray-600 mb-4">
                                For iOS camera access:
                                <br />
                                Settings → Privacy & Security → Camera → Allow
                            </div>
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
                                        Starting official iOS scanner...
                                    </div>
                                    <div className="text-sm mt-2 opacity-75">
                                        Enhanced for {userRegion} products • Official Capacitor Plugin
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Enhanced iOS Scanner Interface */}
                        {!isLoading && (
                            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                                <div className="text-center text-white px-6">
                                    <div className="mb-8">
                                        <div className="w-32 h-32 mx-auto mb-6 border-4 border-white rounded-2xl flex items-center justify-center">
                                            <span className="text-6xl">🍎</span>
                                        </div>
                                        <h2 className="text-2xl font-bold mb-2">Official iOS Scanner Ready</h2>
                                        <p className="text-gray-300 text-lg mb-4">
                                            Official Capacitor barcode scanning with native iOS performance
                                        </p>
                                        <p className="text-sm text-blue-300 mt-2">
                                            Optimized for {userRegion} region • Enhanced accuracy
                                        </p>
                                    </div>

                                    <TouchEnhancedButton
                                        onClick={startOfficialScan}
                                        disabled={isScanning}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                                    >
                                        {isScanning ? '📱 Scanning...' : '📸 Start Official Scan'}
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
                                onClick={handleScannerClose}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg text-lg font-medium"
                            >
                                {isScanning ? 'Cancel Scan' : 'Close'}
                            </TouchEnhancedButton>
                        </div>
                    </>
                )}
            </div>
        </FeatureGate>
    );
}