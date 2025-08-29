'use client';
// file: /src/components/inventory/BarcodeScannerIOS.js v3 - Updated to use native iOS AVFoundation scanner

import {useEffect, useRef, useState, useCallback} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {MobileHaptics} from '@/components/mobile/MobileHaptics';
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import FeatureGate, {UsageLimitDisplay} from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import { apiGet } from '@/lib/api-config';
import { PlatformDetection } from '@/utils/PlatformDetection';

// Import the native barcode scanner
import { scanBarcode, checkPermissions, isNativeScannerAvailable, ScannerErrors } from '@/plugins/native-barcode-scanner';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";


export default function BarcodeScannerIOS({onBarcodeDetected, onClose, isActive}) {
    const scannerContainerRef = useRef(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [scanFeedback, setScanFeedback] = useState('');
    const [platformInfo, setPlatformInfo] = useState(null);

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
            message: `Valid ${analysis.format} barcode${analysis.country ? ` - ${analysis.analysis.country}` : ''}`
        };
    }, [detectBarcodeFormat, getRegionalHints, userRegion]);

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
    }, [playBeepSound]); // ADD playBeepSound to dependencies

    // Native iOS barcode scanner function
    const startNativeScan = useCallback(async () => {
        try {
            console.log('🍎 Starting native iOS AVFoundation barcode scan...');
            setIsScanning(true);
            setError(null);
            setScanFeedback('Opening native iOS camera...');

            // Check permissions first
            const permissions = await checkPermissions();
            if (permissions.camera !== 'granted') {
                provideScanFeedback('error', 'Camera permission required for iOS scanner');
                setIsScanning(false);
                return;
            }

            setScanFeedback('🍎 Native iOS camera ready, position barcode in frame...');

            // Start native scan
            const result = await scanBarcode({
                enableHapticFeedback: true,
                enableAudioFeedback: true
            });

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
            console.error('🍎 Native iOS scanning failed:', error);

            // User-friendly error handling
            if (error.message && (error.message.includes('cancelled') || error.message.includes('USER_CANCELLED'))) {
                console.log('🍎 Native iOS scan cancelled by user');
                provideScanFeedback('info', 'Scan cancelled');
                setIsScanning(false);
                return;
            }

            if (error.message && (error.message.includes('PERMISSION_DENIED'))) {
                provideScanFeedback('error', 'Camera permission required - check iOS Settings');
            } else if (error.message && error.message.includes('CAMERA_ERROR')) {
                provideScanFeedback('error', 'Camera setup failed - please try again');
            } else {
                provideScanFeedback('error', 'Native scan failed - please try again');
            }
            setIsScanning(false);
        }
    }, [analyzeAndValidateBarcode, onBarcodeDetected, onClose, provideScanFeedback]);

    // Always use native scanner on iOS (no fallback)
    const startScan = useCallback(async () => {
        await startNativeScan();
    }, [startNativeScan]);

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

                console.log(`🍎 Starting native iOS scanner session: ${sessionIdRef.current}`);

                if (mountedRef.current) {
                    setIsInitialized(true);
                    setIsLoading(false);
                    setError(null);
                }
            } catch (error) {
                console.error('🍎 Scanner setup error:', error);
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

        if (isActive && mountedRef.current && platformInfo) {
            initializeScanner();
        }
    }, [isActive, isInitialized, platformInfo]);

    // Cleanup function
    const cleanupScanner = useCallback(async () => {
        console.log(`🍎 Cleaning up native iOS scanner...`);

        setIsScanning(false);
        scanInProgressRef.current = false;
    }, []);

    // Handle scanner close
    const handleScannerClose = useCallback(async () => {
        console.log('🍎 iOS official scanner close requested');

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
                                🍎 Native iOS Scanner Limit Reached
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
            {/* iOS Mobile Interface */}
            <div className="fixed inset-0 bg-black z-50 flex flex-col" ref={scannerContainerRef}>
                {/* Enhanced Header with iOS Context */}
                <div className="flex-shrink-0 bg-black text-white px-4 py-3 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">
                            🍎 Native iOS Scanner
                        </h3>
                        <div className="text-sm text-gray-300 mt-1">
                            {scanFeedback || `Native AVFoundation optimized for ${userRegion} region`}
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
                        onClick={handleScannerClose}
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
                            <p className="text-red-200 mb-6">{error}</p>
                            <TouchEnhancedButton
                                onClick={handleScannerClose}
                                className="bg-red-700 hover:bg-red-600 text-white py-3 px-6 rounded-lg"
                            >
                                Close Scanner
                            </TouchEnhancedButton>
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
                                        Starting native iOS scanner...
                                    </div>
                                    <div className="text-sm mt-2 opacity-75">
                                        Native AVFoundation • Enhanced for {userRegion} products
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
                                                🍎
                                            </span>
                                        </div>
                                        <h2 className="text-2xl font-bold mb-2">
                                            Native iOS Scanner Ready
                                        </h2>
                                        <p className="text-gray-300 text-lg mb-4">
                                            Native AVFoundation barcode scanning with iOS optimization
                                        </p>
                                        <p className="text-sm text-blue-300 mt-2">
                                            Optimized for {userRegion} region • Enhanced accuracy
                                        </p>
                                    </div>

                                    <TouchEnhancedButton
                                        onClick={startScan}
                                        disabled={isScanning}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                                    >
                                        {isScanning
                                            ? '📱 Scanning...'
                                            : `📸 Start Native iOS Scan`
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