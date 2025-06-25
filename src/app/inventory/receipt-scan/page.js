'use client';

// file: /src/app/inventory/receipt-scan/page.js - v13 Updated with proper feature gating for admin tier

import {useState, useRef, useEffect} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import {useRouter} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {getApiUrl} from '@/lib/api-config';
// NEW: Import proper feature gating
import {useSubscription} from '@/hooks/useSubscription';
import {FEATURE_GATES} from '@/lib/subscription-config';
import FeatureGate from '@/components/subscription/FeatureGate';

export default function ReceiptScan() {
    // const {data: session, status} = useSafeSession();
    const router = useRouter();
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const cameraContainerRef = useRef(null); // NEW: Ref for auto-scroll

    // State management - ALL HOOKS FIRST (Fixed order)
    const {data: session, status} = useSafeSession();
    // NEW: Use subscription hook instead of manual usage checking
    const subscription = useSubscription();

    // REMOVED: Manual usage state management
    // const [receiptScanUsage, setReceiptScanUsage] = useState(null);
    // const [usageLoading, setUsageLoading] = useState(true);

    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [capturedImage, setCapturedImage] = useState(null);
    const [extractedItems, setExtractedItems] = useState([]);
    const [showCamera, setShowCamera] = useState(false);
    const [step, setStep] = useState('upload'); // 'upload', 'processing', 'review', 'adding'
    const [processingStatus, setProcessingStatus] = useState('');
    const [cameraError, setCameraError] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showIOSPWAModal, setShowIOSPWAModal] = useState(false); // FIXED: Moved before usage
    const [reportData, setReportData] = useState({
        issue: '',
        description: '',
        email: '',
        receiptImage: null,
        additionalFiles: []
    });

    // iOS PWA detection state
    const [deviceInfo, setDeviceInfo] = useState({
        isIOS: false,
        isIOSPWA: false,
        isPWA: false,
        userAgent: '',
        displayMode: '',
        standalone: false
    });

    useEffect(() => {
        return () => {
            if (capturedImage) {
                URL.revokeObjectURL(capturedImage);
            }
        };
    }, [capturedImage]);

    // Device detection effect
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
            const isIOSPWA = isIOS && isStandalone;

            setDeviceInfo({
                isIOS,
                isIOSPWA,
                isPWA: isStandalone,
                userAgent: navigator.userAgent,
                displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
                standalone: !!window.navigator.standalone
            });

            console.log('📱 Device Detection:', {
                isIOS,
                isIOSPWA,
                isPWA: isStandalone,
                userAgent: navigator.userAgent.substring(0, 100) + '...',
                displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
            });
        }
    }, []);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // REMOVED: Manual usage checking effect
    // useEffect(() => {
    //     if (session?.user?.id && status === 'authenticated') {
    //         checkReceiptScanUsage();
    //     }
    // }, [session?.user?.id, status]);

    // REMOVED: Manual usage checking function
    // async function checkReceiptScanUsage() { ... }

    // NEW: Get usage info from subscription hook
    const getReceiptScanUsage = () => {
        if (subscription.loading) {
            return {
                canScan: false,
                loading: true,
                currentMonth: 0,
                monthlyLimit: '...',
                remaining: '...'
            };
        }

        // Admin always has unlimited access
        if (subscription.isAdmin) {
            return {
                canScan: true,
                loading: false,
                currentMonth: subscription.usage.monthlyReceiptScans || 0,
                monthlyLimit: 'unlimited',
                remaining: 'unlimited'
            };
        }

        const currentScans = subscription.usage.monthlyReceiptScans || 0;
        let monthlyLimit;
        let canScan;

        switch (subscription.tier) {
            case 'free':
                monthlyLimit = 2;
                canScan = currentScans < monthlyLimit;
                break;
            case 'gold':
                monthlyLimit = 20;
                canScan = currentScans < monthlyLimit;
                break;
            case 'platinum':
                monthlyLimit = 'unlimited';
                canScan = true;
                break;
            default:
                monthlyLimit = 2;
                canScan = currentScans < monthlyLimit;
        }

        const remaining = monthlyLimit === 'unlimited' ? 'unlimited' : Math.max(0, monthlyLimit - currentScans);

        return {
            canScan,
            loading: false,
            currentMonth: currentScans,
            monthlyLimit,
            remaining
        };
    };

    // UPDATED: Simplified usage check using subscription hook
    function checkUsageLimitsBeforeScan() {
        if (subscription.loading) {
            alert('⏳ Please wait while we check your scan limits...');
            return false;
        }

        // Admin always has access
        if (subscription.isAdmin) {
            return true;
        }

        const usage = getReceiptScanUsage();
        if (!usage.canScan) {
            const limitMessage = usage.monthlyLimit === 'unlimited'
                ? 'Unexpected limit reached'
                : `You've reached your monthly limit of ${usage.monthlyLimit} receipt scans. Used: ${usage.currentMonth}/${usage.monthlyLimit}`;

            alert(`❌ ${limitMessage}\n\nUpgrade to Gold for 20 scans/month or Platinum for unlimited scanning!`);

            // Redirect to pricing
            window.location.href = `/pricing?source=receipt-scan-limit&feature=receipt-scanning&required=gold`;
            return false;
        }

        return true;
    }

    // NEW: Auto-scroll function
    function scrollToCameraView() {
        setTimeout(() => {
            if (cameraContainerRef.current) {
                cameraContainerRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100); // Small delay to ensure DOM is updated
    }

    // Early returns AFTER all hooks are defined
    if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return null;
    }

    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-lg">Loading...</div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // iOS PWA Camera Modal Component - Enhanced with better UX
    function IOSPWACameraModal() {
        if (!showIOSPWAModal) return null;

        const usage = getReceiptScanUsage();

        if (!usage.loading && !usage.canScan) {
            return (
                <MobileOptimizedLayout>
                    <div className="space-y-6">
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="text-center py-12">
                                    <div
                                        className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Monthly Scan Limit
                                        Reached</h3>
                                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                        You've used all {usage.monthlyLimit} of your receipt scans this month.
                                        Your scans will reset on the 1st of next month.
                                    </p>
                                    <div className="space-y-4">
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/pricing?source=receipt-scan-limit&feature=receipt-scanning'}
                                            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold"
                                        >
                                            Upgrade for More Scans
                                        </TouchEnhancedButton>

                                        <div
                                            className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                                            <h4 className="text-sm font-medium text-blue-900 mb-2">📱 Upgrade
                                                Benefits:</h4>
                                            <ul className="text-sm text-blue-800 space-y-1 text-left">
                                                <li>• <strong>Gold:</strong> 20 receipt scans per month</li>
                                                <li>• <strong>Platinum:</strong> Unlimited receipt scanning</li>
                                                <li>• Advanced OCR text recognition</li>
                                                <li>• Automatic item categorization</li>
                                                <li>• UPC code detection and lookup</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </MobileOptimizedLayout>
            );
        }
    }

    // [Keep all your existing camera and OCR functions unchanged]
    // ... (all the camera initialization, OCR processing functions stay the same)

    // Just showing the key ones that need usage updates:

    // ENHANCED: Enhanced camera start function with usage gating and auto-scroll
    async function startCamera() {
        // NEW: Check usage limits BEFORE starting camera
        if (!checkUsageLimitsBeforeScan()) {
            return;
        }

        setCameraError(null);

        try {
            // Use the optimized camera initialization
            const stream = await initializeOptimizedCamera(deviceInfo);
            streamRef.current = stream;

            // FIXED: Add null check before video setup
            if (!videoRef.current) {
                console.warn('Video ref is null, waiting for DOM to be ready...');
                setShowCamera(true);

                // Wait for the video element to be available
                setTimeout(async () => {
                    if (videoRef.current) {
                        await setupOptimizedVideo(videoRef.current, stream, deviceInfo);
                        scrollToCameraView(); // NEW: Auto-scroll after camera is ready
                    } else {
                        throw new Error('Video element not available after timeout');
                    }
                }, 200);
            } else {
                // Use the optimized video setup
                await setupOptimizedVideo(videoRef.current, stream, deviceInfo);
                setShowCamera(true);
                scrollToCameraView(); // NEW: Auto-scroll immediately
            }

            console.log('🎉 Optimized camera setup completed successfully!');

        } catch (error) {
            console.error('❌ Optimized camera setup failed:', error);

            // Your existing error handling...
            if (deviceInfo.isIOSPWA) {
                setCameraError('iOS PWA Camera Failed After All Attempts');
                setShowIOSPWAModal(true);
                return;
            }

            setCameraError(error.message);
        }
    }

    // [Include all your other existing functions - they don't need changes]
    // ... stopCamera, capturePhoto, processImage, etc.

    // Main render with feature gating
    return (
        <MobileOptimizedLayout>
            {/* NEW: Wrap the entire receipt scanner in a feature gate */}
            <FeatureGate
                feature={FEATURE_GATES.RECEIPT_SCAN}
                fallback={
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">📄 Receipt Scanner</h1>
                                    <p className="text-gray-600">Scan your receipt to quickly add items to inventory</p>
                                </div>
                                <TouchEnhancedButton
                                    onClick={() => router.push('/inventory')}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    ← Back to Inventory
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        {/* Premium Feature Showcase */}
                        <div
                            className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-xl p-8 mb-8 border border-purple-200">
                            <div className="text-center mb-6">
                                <div className="text-6xl mb-4">📄✨</div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                    Receipt Scanning is a Gold Feature
                                </h2>
                                <p className="text-gray-700 max-w-2xl mx-auto">
                                    Save time by scanning grocery receipts to automatically add multiple items to your
                                    inventory at once.
                                    Advanced OCR technology extracts item names, quantities, and prices.
                                </p>
                            </div>

                            {/* Feature Benefits */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                    <div className="text-2xl mb-2">🔍</div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Smart OCR</h3>
                                    <p className="text-sm text-gray-600">Advanced text recognition extracts items
                                        automatically</p>
                                </div>
                                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                    <div className="text-2xl mb-2">⚡</div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Bulk Adding</h3>
                                    <p className="text-sm text-gray-600">Add dozens of items to inventory in seconds</p>
                                </div>
                                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                    <div className="text-2xl mb-2">🏷️</div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Auto Categories</h3>
                                    <p className="text-sm text-gray-600">Intelligent categorization and UPC lookup</p>
                                </div>
                            </div>

                            {/* Usage Limits */}
                            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Scan Limits by
                                    Plan</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">🆓</div>
                                        <h4 className="font-medium text-gray-700 mb-1">Free Plan</h4>
                                        <p className="text-sm text-gray-600">2 scans per month</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">🥇</div>
                                        <h4 className="font-medium text-gray-700 mb-1">Gold Plan</h4>
                                        <p className="text-sm text-gray-600">20 scans per month</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">💎</div>
                                        <h4 className="font-medium text-gray-700 mb-1">Platinum Plan</h4>
                                        <p className="text-sm text-gray-600">Unlimited scanning</p>
                                    </div>
                                </div>
                            </div>

                            {/* Upgrade CTA */}
                            <div className="text-center">
                                <TouchEnhancedButton
                                    onClick={() => window.location.href = '/pricing?source=receipt-scanner'}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                                >
                                    Upgrade to Gold - Start Scanning!
                                </TouchEnhancedButton>
                                <p className="text-sm text-gray-600 mt-3">
                                    7-day free trial • $4.99/month Gold, $9.99/month Platinum • Cancel anytime
                                </p>
                            </div>
                        </div>

                        {/* Free Alternatives */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                💡 Free Alternatives While You Decide
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="text-center">
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = '/inventory'}
                                        className="w-full bg-blue-100 text-blue-700 py-3 px-4 rounded-lg hover:bg-blue-200 transition-colors"
                                    >
                                        Manual Entry
                                    </TouchEnhancedButton>
                                    <p className="text-xs text-gray-600 mt-2">Add items one by one manually</p>
                                </div>
                                <div className="text-center">
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = '/inventory?wizard=true'}
                                        className="w-full bg-green-100 text-green-700 py-3 px-4 rounded-lg hover:bg-green-200 transition-colors"
                                    >
                                        Common Items Wizard
                                    </TouchEnhancedButton>
                                    <p className="text-xs text-gray-600 mt-2">Quick-add household staples</p>
                                </div>
                            </div>
                        </div>

                        <Footer/>
                    </div>
                }
            >
                {/* EXISTING: Your full receipt scanner interface goes here */}
                <div className="space-y-6">
                    {/* Header */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">📄 Receipt Scanner</h1>
                                <p className="text-gray-600">Scan your receipt to quickly add items to inventory</p>
                                {/* Debug info for development */}
                                {process.env.NODE_ENV === 'development' && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        {deviceInfo.isIOSPWA ? '📱 iOS PWA Mode' : deviceInfo.isIOS ? '📱 iOS Browser' : '📱 Standard'}
                                    </div>
                                )}
                            </div>
                            <TouchEnhancedButton
                                onClick={() => router.push('/inventory')}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                ← Back to Inventory
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            {/* Step 1: Upload/Capture */}
                            {step === 'upload' && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="text-6xl mb-4">📱</div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Capture Your Receipt
                                        </h3>
                                        <p className="text-gray-600 mb-6">
                                            Take a photo or upload an image of your shopping receipt
                                        </p>
                                    </div>

                                    {/* NEW: Usage display using subscription hook */}
                                    {(() => {
                                        const usage = getReceiptScanUsage();
                                        if (!usage.loading && usage.remaining !== 'unlimited') {
                                            return (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0">
                                                            <svg className="w-5 h-5 text-blue-400" fill="currentColor"
                                                                 viewBox="0 0 20 20">
                                                                <path fillRule="evenodd"
                                                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                                      clipRule="evenodd"/>
                                                            </svg>
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm text-blue-700">
                                                                <strong>📊 {usage.remaining} receipt scans remaining this
                                                                    month</strong>
                                                            </p>
                                                            <p className="text-xs text-blue-600 mt-1">
                                                                Used: {usage.currentMonth}/{usage.monthlyLimit}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* Camera and Upload buttons */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <TouchEnhancedButton
                                            onClick={startCamera}
                                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                        >
                                            <div className="text-4xl mb-2">📷</div>
                                            <div className="text-lg font-medium text-indigo-700">Take Photo</div>
                                            <div className="text-sm text-gray-500">
                                                {deviceInfo.isIOSPWA ? 'iOS PWA - Will try aggressive fixes' : 'Use device camera'}
                                            </div>
                                        </TouchEnhancedButton>

                                        <TouchEnhancedButton
                                            onClick={() => {
                                                if (checkUsageLimitsBeforeScan() && fileInputRef.current) {
                                                    fileInputRef.current.click();
                                                }
                                            }}
                                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                                        >
                                            <div className="text-4xl mb-2">📁</div>
                                            <div className="text-lg font-medium text-green-700">Upload Image</div>
                                            <div className="text-sm text-gray-500">Select from gallery</div>
                                        </TouchEnhancedButton>
                                    </div>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file && file.type.startsWith('image/')) {
                                                const imageUrl = URL.createObjectURL(file);
                                                setCapturedImage(imageUrl);
                                                processImage(file);
                                            } else {
                                                alert('Please select a valid image file.');
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = '';
                                                }
                                            }
                                        }}
                                        className="hidden"
                                    />

                                    {/* iOS PWA specific guidance - Reframed positively */}
                                    {deviceInfo.isIOSPWA && (
                                        <div
                                            className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <h4 className="text-sm font-medium text-blue-900 mb-2">
                                                📱 iOS PWA Camera Tips
                                            </h4>
                                            <p className="text-sm text-blue-800 mb-3">
                                                <strong>Quick tip:</strong> If the
                                                camera doesn't work immediately, the
                                                "Upload Image" option
                                                works perfectly! Just take a photo with
                                                your iPhone camera first, then
                                                upload it here.
                                            </p>
                                            <div className="text-xs text-blue-700">
                                                Both methods provide identical OCR
                                                processing and results.
                                            </div>
                                        </div>
                                    )}

                                    {/* Error display */}
                                    {cameraError && !deviceInfo.isIOSPWA && (
                                        <div
                                            className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div
                                                className="text-red-700">❌ {cameraError}</div>
                                            <div className="text-sm text-red-600 mt-2">
                                                Please try using the upload option
                                                instead, or check your camera
                                                permissions.
                                            </div>
                                        </div>
                                    )}

                                    {/* Tips */}
                                    <div
                                        className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-blue-900 mb-2">📝
                                            Tips for Best Results:</h4>
                                        <ul className="text-sm text-blue-800 space-y-1">
                                            <li>• Ensure receipt is flat and well-lit
                                            </li>
                                            <li>• Avoid shadows and glare</li>
                                            <li>• Include the entire receipt in the
                                                frame
                                            </li>
                                            <li>• Higher resolution images work better
                                            </li>
                                            {deviceInfo.isIOS &&
                                                <li>• iOS PWA may take longer to
                                                    initialize camera</li>}
                                        </ul>
                                    </div>

                                    {/* Report Issue Section */}
                                    <div
                                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-yellow-900 mb-2">🐛
                                            Having Issues?</h4>
                                        <p className="text-sm text-yellow-800 mb-3">
                                            If the receipt scanner isn't working
                                            properly with your receipt, you can report
                                            the issue to help us improve it.
                                        </p>
                                        <TouchEnhancedButton
                                            onClick={openReportModal}
                                            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                                        >
                                            📧 Report Receipt Issue
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            )}

                            {/* Camera View - Enhanced with iOS detection and auto-scroll ref */}
                            {showCamera && (
                                <div ref={cameraContainerRef} className="space-y-4">
                                    <div className="text-center">
                                        <h3 className="text-lg font-medium mb-4">📷
                                            Camera View</h3>
                                        {deviceInfo.isIOS && (
                                            <p className="text-sm text-yellow-600 mb-2">
                                                iOS device detected - using optimized
                                                camera settings
                                            </p>
                                        )}
                                    </div>

                                    <div
                                        className="relative bg-black rounded-lg overflow-hidden">
                                        {/* Clean video container for iOS PWA compatibility */}
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-96 object-cover bg-black"
                                            style={{
                                                display: 'block',
                                                minHeight: '400px'
                                            }}
                                            webkit-playsinline="true"
                                        />

                                        {/* Camera overlay */}
                                        <div
                                            className="absolute inset-4 border-2 border-white border-dashed rounded-lg pointer-events-none">
                                            <div
                                                className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                                📱 Position receipt here
                                            </div>
                                            <div
                                                className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                                📏 Fill frame completely
                                            </div>
                                            {deviceInfo.isIOS && (
                                                <div
                                                    className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                                    📱 iOS Mode
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-center space-x-4">
                                        <TouchEnhancedButton
                                            onClick={capturePhoto}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                        >
                                            📸 Capture Receipt
                                        </TouchEnhancedButton>
                                        <TouchEnhancedButton
                                            onClick={stopCamera}
                                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                                        >
                                            Cancel
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Debug info for camera */}
                                    {process.env.NODE_ENV === 'development' && (
                                        <div
                                            className="text-xs text-center bg-gray-100 p-2 rounded text-gray-600">
                                            Camera: {videoRef.current?.videoWidth || 0} x {videoRef.current?.videoHeight || 0}
                                            {deviceInfo.isIOS ? ' (iOS optimized)' : ''}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Processing */}
                            {step === 'processing' && (
                                <div className="text-center space-y-6">
                                    <div className="text-6xl mb-4">🔍</div>
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Processing Receipt
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        {processingStatus}
                                    </p>

                                    {/* Progress Bar */}
                                    <div
                                        className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                            style={{width: `${ocrProgress}%`}}
                                        ></div>
                                    </div>

                                    {capturedImage && (
                                        <div className="mt-4">
                                            <img
                                                src={capturedImage}
                                                alt="Captured receipt"
                                                className="max-w-xs mx-auto rounded-lg shadow-md"
                                            />
                                        </div>
                                    )}

                                    <div
                                        className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                </div>
                            )}

                            {/* Step 3: Review Items */}
                            {step === 'review' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">
                                                Review Extracted Items
                                            </h3>
                                            <p className="text-gray-600">
                                                {extractedItems.filter(item => item.selected).length} of {extractedItems.length} items
                                                selected
                                            </p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <TouchEnhancedButton
                                                onClick={resetScan}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                            >
                                                Start Over
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                onClick={openReportModal}
                                                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                                            >
                                                📧 Report Issue
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                onClick={addItemsToInventory}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                            >
                                                Add to Inventory
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>

                                    {/* Captured Image Preview */}
                                    {capturedImage && (
                                        <div className="text-center">
                                            <img
                                                src={capturedImage}
                                                alt="Captured receipt"
                                                className="max-w-sm mx-auto rounded-lg shadow-md"
                                            />
                                        </div>
                                    )}

                                    {/* Items List */}
                                    <div className="space-y-4">
                                        {extractedItems.length === 0 ? (
                                            <div
                                                className="text-center py-8 text-gray-500">
                                                No items were extracted from the
                                                receipt. Please try again with a
                                                clearer image.
                                            </div>
                                        ) : (
                                            extractedItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={`border rounded-lg p-4 ${item.selected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}
                                                >
                                                    <div
                                                        className="flex items-start space-x-3">
                                                        {/* Selection Checkbox */}
                                                        <input
                                                            type="checkbox"
                                                            checked={item.selected}
                                                            onChange={() => toggleItemSelection(item.id)}
                                                            className="mt-1 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        />

                                                        {/* Item Details */}
                                                        <div
                                                            className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            {/* Name */}
                                                            <div>
                                                                <label
                                                                    className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Item Name
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={item.name}
                                                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                                />
                                                            </div>

                                                            {/* Category */}
                                                            <div>
                                                                <label
                                                                    className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Category
                                                                </label>
                                                                <select
                                                                    value={item.category}
                                                                    onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                                >
                                                                    <option value="">Select category</option>
                                                                    <option value="Dairy">Dairy</option>
                                                                    <option value="Breads">Breads</option>
                                                                    <option value="Fresh Fruits">Fresh Fruits</option>
                                                                    <option value="Fresh Vegetables">Fresh Vegetables
                                                                    </option>
                                                                    <option value="Fresh/Frozen Meat">Fresh/Frozen Meat
                                                                    </option>
                                                                    <option value="Other">Other</option>
                                                                </select>
                                                            </div>

                                                            {/* Quantity & Location */}
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label
                                                                        className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Qty
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={item.quantity}
                                                                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label
                                                                        className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Location
                                                                    </label>
                                                                    <select
                                                                        value={item.location}
                                                                        onChange={(e) => updateItem(item.id, 'location', e.target.value)}
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                                    >
                                                                        <option value="pantry">Pantry</option>
                                                                        <option value="kitchen">Kitchen Cabinets
                                                                        </option>
                                                                        <option value="fridge">Fridge</option>
                                                                        <option value="freezer">Freezer</option>
                                                                        <option value="other">Other</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* UPC Lookup Button */}
                                                        {item.upc && (
                                                            <TouchEnhancedButton
                                                                onClick={() => lookupByUPC(item)}
                                                                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                                                title={`Lookup product details for UPC: ${item.upc}`}
                                                            >
                                                                🔍 Lookup
                                                            </TouchEnhancedButton>
                                                        )}
                                                    </div>

                                                    {/* Additional Info */}
                                                    <div
                                                        className="mt-2 text-sm text-gray-500 flex items-center space-x-4">
                                                        <span>Price: ${item.price.toFixed(2)}</span>
                                                        {item.upc && <span>UPC: {item.upc}</span>}
                                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                                        {item.rawText}
                                                    </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Adding to Inventory */}
                            {step === 'adding' && (
                                <div className="text-center space-y-6">
                                    <div className="text-6xl mb-4">📦</div>
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Adding Items to Inventory
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        {processingStatus}
                                    </p>
                                    <div
                                        className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hidden canvas for photo capture - Always rendered */}
                    <canvas ref={canvasRef} className="hidden"/>

                    {/* iOS PWA Camera Modal */}
                    <IOSPWACameraModal/>

                    {/* Report Issue Modal */}
                    {showReportModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">📧 Report Receipt Issue</h3>
                                        <TouchEnhancedButton
                                            onClick={() => setShowReportModal(false)}
                                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                        >
                                            ×
                                        </TouchEnhancedButton>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                What type of issue are you experiencing? *
                                            </label>
                                            <select
                                                value={reportData.issue}
                                                onChange={(e) => setReportData(prev => ({
                                                    ...prev,
                                                    issue: e.target.value
                                                }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="">Select an issue...</option>
                                                <option value="ios-pwa-camera-not-working">iOS PWA Camera Not Working
                                                </option>
                                                <option value="camera-not-working">Camera not working</option>
                                                <option value="ocr-poor-accuracy">Poor text recognition</option>
                                                <option value="wrong-items-detected">Wrong items detected</option>
                                                <option value="missing-items">Items not detected</option>
                                                <option value="categories-wrong">Wrong categories assigned</option>
                                                <option value="upc-lookup-failed">UPC lookup not working</option>
                                                <option value="app-crash">App crashed/froze</option>
                                                <option value="other">Other issue</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Please describe the issue in detail *
                                            </label>
                                            <textarea
                                                value={reportData.description}
                                                onChange={(e) => setReportData(prev => ({
                                                    ...prev,
                                                    description: e.target.value
                                                }))}
                                                placeholder="Describe what happened, what you expected, and any steps to reproduce the issue..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                rows={4}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Your email (for follow-up)
                                            </label>
                                            <input
                                                type="email"
                                                value={reportData.email}
                                                onChange={(e) => setReportData(prev => ({
                                                    ...prev,
                                                    email: e.target.value
                                                }))}
                                                placeholder="your.email@example.com"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        {capturedImage && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Receipt Image (will be included)
                                                </label>
                                                <img
                                                    src={capturedImage}
                                                    alt="Receipt to be sent"
                                                    className="max-w-full h-32 object-contain border rounded"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Additional Screenshots/Images
                                            </label>
                                            <div className="space-y-3">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={handleReportFileUpload}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <p className="text-xs text-gray-500">
                                                    Upload screenshots showing the issue. Supports: JPG, PNG, GIF, WebP
                                                    (max
                                                    10MB each)
                                                </p>

                                                {reportData.additionalFiles.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-medium text-gray-700">
                                                            Files to be sent ({reportData.additionalFiles.length}):
                                                        </p>
                                                        {reportData.additionalFiles.map((file, index) => (
                                                            <div key={index}
                                                                 className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-sm">📸</span>
                                                                    <span className="text-sm text-gray-700 truncate">
                                                    {file.name}
                                                </span>
                                                                    <span className="text-xs text-gray-500">
                                                    ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                                </span>
                                                                </div>
                                                                <TouchEnhancedButton
                                                                    onClick={() => removeFile(index)}
                                                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                                >
                                                                    Remove
                                                                </TouchEnhancedButton>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-sm text-blue-800">
                                                📝 <strong>Your report will include:</strong>
                                            </p>
                                            <ul className="text-sm text-blue-700 mt-1 space-y-1">
                                                <li>• Your issue description</li>
                                                <li>• Device
                                                    info: {deviceInfo.isIOSPWA ? 'iOS PWA Mode' : deviceInfo.isIOS ? 'iOS Browser' : 'Standard Browser'}</li>
                                                {capturedImage && <li>• Receipt image</li>}
                                                {reportData.additionalFiles.length > 0 && (
                                                    <li>• {reportData.additionalFiles.length} additional
                                                        screenshot{reportData.additionalFiles.length > 1 ? 's' : ''}</li>
                                                )}
                                                <li>• Browser and device information</li>
                                                <li>• No personal information from your account</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="flex space-x-3 mt-6">
                                        <TouchEnhancedButton
                                            onClick={() => setShowReportModal(false)}
                                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                        >
                                            Cancel
                                        </TouchEnhancedButton>
                                        <TouchEnhancedButton
                                            onClick={submitIssueReport}
                                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                        >
                                            📧 Send Report
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <Footer/>
                </div>
            </FeatureGate>
        </MobileOptimizedLayout>
    );
}