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
    const router = useRouter();
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const cameraContainerRef = useRef(null);

    // State management - ALL HOOKS FIRST
    const {data: session, status} = useSafeSession();
    // NEW: Use subscription hook instead of manual usage checking
    const subscription = useSubscription();

    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [capturedImage, setCapturedImage] = useState(null);
    const [extractedItems, setExtractedItems] = useState([]);
    const [showCamera, setShowCamera] = useState(false);
    const [step, setStep] = useState('upload'); // 'upload', 'processing', 'review', 'adding'
    const [processingStatus, setProcessingStatus] = useState('');
    const [cameraError, setCameraError] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showIOSPWAModal, setShowIOSPWAModal] = useState(false);
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

    const getReceiptScanUsageDisplay = () => {
        if (subscription.loading) {
            return {
                current: '...',
                limit: '...',
                isUnlimited: false,
                tier: 'free',
                remaining: '...'
            };
        }

        // Admin always has unlimited access
        if (subscription.isAdmin) {
            return {
                current: subscription.usage.monthlyReceiptScans || 0,
                limit: 'unlimited',
                isUnlimited: true,
                tier: 'admin',
                remaining: 'unlimited'
            };
        }

        const currentScans = subscription.usage.monthlyReceiptScans || 0;
        let monthlyLimit;
        let isUnlimited = false;

        switch (subscription.tier) {
            case 'free':
                monthlyLimit = 2;
                break;
            case 'gold':
                monthlyLimit = 20;
                break;
            case 'platinum':
                monthlyLimit = 'unlimited';
                isUnlimited = true;
                break;
            default:
                monthlyLimit = 2;
        }

        const remaining = isUnlimited ? 'unlimited' : Math.max(0, monthlyLimit - currentScans);

        return {
            current: currentScans,
            limit: monthlyLimit,
            isUnlimited,
            tier: subscription.tier || 'free',
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

    // Auto-scroll function
    function scrollToCameraView() {
        setTimeout(() => {
            if (cameraContainerRef.current) {
                cameraContainerRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100);
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
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading dashboard...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // iOS PWA Camera Modal Component
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
                                    <div className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Monthly Scan Limit Reached</h3>
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

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                                            <h4 className="text-sm font-medium text-blue-900 mb-2">📱 Upgrade Benefits:</h4>
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

    // OPTIMIZED Camera Access and OCR Configuration
    function getOptimizedCameraConstraints(deviceInfo) {
        const standardConstraints = {
            video: {
                facingMode: {ideal: "environment"},
                width: {ideal: 1920, min: 1280, max: 3840},
                height: {ideal: 1080, min: 720, max: 2160},
                aspectRatio: {ideal: 16 / 9},
                focusMode: {ideal: "continuous"},
                exposureMode: {ideal: "continuous"},
                whiteBalanceMode: {ideal: "continuous"},
                torch: false
            },
            audio: false
        };

        const iosPWAConstraints = [
            {
                video: {
                    facingMode: {exact: "environment"},
                    width: {ideal: 1280, max: 1920},
                    height: {ideal: 720, max: 1080}
                },
                audio: false
            },
            {
                video: {
                    facingMode: "environment",
                    width: {ideal: 1280},
                    height: {ideal: 720}
                },
                audio: false
            },
            {
                video: {
                    width: {ideal: 640, min: 480},
                    height: {ideal: 480, min: 360}
                },
                audio: false
            }
        ];

        const mobileConstraints = {
            video: {
                facingMode: {ideal: "environment"},
                width: {ideal: 1920, min: 1280},
                height: {ideal: 1080, min: 720},
                frameRate: {ideal: 30, max: 30}
            },
            audio: false
        };

        if (deviceInfo.isIOSPWA) {
            return iosPWAConstraints;
        } else if (deviceInfo.isMobile) {
            return [mobileConstraints];
        } else {
            return [standardConstraints];
        }
    }

    async function initializeOptimizedCamera(deviceInfo) {
        console.log('🎥 Initializing optimized camera for receipt scanning...');

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera API not supported on this device');
        }

        let devices = [];
        try {
            devices = await navigator.mediaDevices.enumerateDevices();
            console.log('📷 Available cameras:', devices.filter(d => d.kind === 'videoinput').length);
        } catch (e) {
            console.log('Could not enumerate devices, proceeding with basic constraints');
        }

        const constraintSets = getOptimizedCameraConstraints(deviceInfo);
        let stream = null;
        let lastError = null;

        for (let i = 0; i < constraintSets.length; i++) {
            const constraints = constraintSets[i];
            console.log(`📷 Attempting camera with constraints ${i + 1}/${constraintSets.length}`);

            try {
                const timeout = deviceInfo.isMobile ? 10000 : 5000;
                const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Camera timeout')), timeout)
                );

                stream = await Promise.race([streamPromise, timeoutPromise]);

                if (stream?.getVideoTracks().length > 0) {
                    console.log('✅ Camera stream obtained successfully');

                    const track = stream.getVideoTracks()[0];
                    const settings = track.getSettings();
                    console.log('📹 Camera settings:', {
                        width: settings.width,
                        height: settings.height,
                        frameRate: settings.frameRate,
                        facingMode: settings.facingMode
                    });

                    return stream;
                }
            } catch (error) {
                console.log(`❌ Constraint set ${i + 1} failed:`, error.message);
                lastError = error;

                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
            }
        }

        throw lastError || new Error('All camera initialization attempts failed');
    }

    async function setupOptimizedVideo(videoElement, stream, deviceInfo) {
        console.log('🎬 Setting up optimized video element...');

        if (!videoElement) {
            throw new Error('Video element is null or undefined');
        }

        if (!stream) {
            throw new Error('Stream is null or undefined');
        }

        if (deviceInfo.isIOS) {
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('webkit-playsinline', 'true');
            videoElement.muted = true;
            videoElement.autoplay = true;
            videoElement.controls = false;
        }

        if (videoElement.style) {
            videoElement.style.objectFit = 'cover';
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
        }

        videoElement.srcObject = stream;

        return new Promise((resolve, reject) => {
            const timeout = deviceInfo.isIOSPWA ? 15000 : 8000;
            let resolved = false;

            const cleanup = () => {
                videoElement.removeEventListener('loadedmetadata', onReady);
                videoElement.removeEventListener('canplay', onReady);
                videoElement.removeEventListener('error', onError);
                clearTimeout(timeoutId);
            };

            const onReady = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                console.log(`✅ Video ready: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
                resolve();
            };

            const onError = (e) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                reject(new Error(`Video setup error: ${e.message}`));
            };

            const timeoutId = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                cleanup();

                if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                    console.log('✅ Video ready via timeout check');
                    resolve();
                } else {
                    reject(new Error('Video setup timeout'));
                }
            }, timeout);

            videoElement.addEventListener('loadedmetadata', onReady);
            videoElement.addEventListener('canplay', onReady);
            videoElement.addEventListener('error', onError);

            if (deviceInfo.isIOS) {
                videoElement.play().catch(e => console.log('Video autoplay prevented:', e));
            }
        });
    }

    function captureOptimizedImage(videoElement, canvasElement) {
        console.log('📸 Capturing optimized image for OCR...');

        if (!videoElement) {
            throw new Error('Video element is null');
        }

        if (!canvasElement) {
            throw new Error('Canvas element is null');
        }

        const video = videoElement;
        const canvas = canvasElement;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width === 0 || height === 0) {
            throw new Error('Video not ready for capture - no dimensions');
        }

        console.log(`📹 Capturing at ${width}x${height}`);

        canvas.width = width;
        canvas.height = height;

        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(video, 0, 0, width, height);

        try {
            const imageData = ctx.getImageData(0, 0, width, height);
            const processedImageData = optimizeImageForOCR(imageData);
            ctx.putImageData(processedImageData, 0, 0);
        } catch (error) {
            console.warn('⚠️ Image processing failed, using original image:', error);
        }

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create image blob'));
                }
            }, 'image/jpeg', 0.98);
        });
    }

    function optimizeImageForOCR(imageData) {
        console.log('🔧 Applying OCR-optimized image processing...');

        if (!imageData || !imageData.data) {
            throw new Error('Invalid image data');
        }

        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        if (data.length === 0) {
            throw new Error('Empty image data');
        }

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            const contrast = 1.3;
            const brightness = 15;
            const enhanced = Math.min(255, Math.max(0,
                contrast * (gray - 128) + 128 + brightness
            ));

            const sharp = applySharpening(data, i, width, height);

            data[i] = enhanced + sharp;
            data[i + 1] = enhanced + sharp;
            data[i + 2] = enhanced + sharp;
        }

        return imageData;
    }

    function applySharpening(data, index, width, height) {
        const kernelSize = 3;
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        return Math.min(15, Math.max(-15,
            (data[index] * kernel[4]) -
            (data[index - 4] || 0) -
            (data[index + 4] || 0)
        ));
    }

    function getOptimizedOCRConfig(deviceInfo) {
        console.log('⚙️ Configuring optimized OCR settings...');

        const baseConfig = {
            tessedit_pageseg_mode: '6',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$/()@-: ',
            preserve_interword_spaces: '1',
            tessedit_do_invert: '0',
            tessedit_create_hocr: '0',
            tessedit_create_pdf: '0',
            tessedit_create_txt: '1',
        };

        if (deviceInfo.isMobile) {
            return {
                ...baseConfig,
                user_defined_dpi: '200',
                tessedit_parallelize: '0',
            };
        }

        return {
            ...baseConfig,
            user_defined_dpi: '300',
            tessedit_parallelize: '1',
        };
    }

    async function processImageWithOptimizedOCR(imageBlob, deviceInfo, progressCallback) {
        console.log('🔍 Starting optimized OCR processing...');

        try {
            const Tesseract = (await import('tesseract.js')).default;

            const worker = await Tesseract.createWorker('eng', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text' && progressCallback) {
                        const progress = Math.round(m.progress * 100);
                        console.log(`OCR Progress: ${progress}%`);
                        progressCallback(progress);
                    }
                }
            });

            const ocrConfig = getOptimizedOCRConfig(deviceInfo);

            console.log('📄 Recognizing text...');
            const {data: {text, confidence}} = await worker.recognize(imageBlob, ocrConfig);

            console.log(`✅ OCR completed with ${confidence}% confidence`);
            console.log(`📝 Extracted text length: ${text.length} characters`);

            await worker.terminate();

            return text;

        } catch (error) {
            console.error('❌ OCR processing failed:', error);
            throw error;
        }
    }

    // Enhanced camera start function
    async function startCamera() {
        if (!checkUsageLimitsBeforeScan()) {
            return;
        }

        setCameraError(null);

        try {
            const stream = await initializeOptimizedCamera(deviceInfo);
            streamRef.current = stream;

            if (!videoRef.current) {
                console.warn('Video ref is null, waiting for DOM to be ready...');
                setShowCamera(true);

                setTimeout(async () => {
                    if (videoRef.current) {
                        await setupOptimizedVideo(videoRef.current, stream, deviceInfo);
                        scrollToCameraView();
                    } else {
                        throw new Error('Video element not available after timeout');
                    }
                }, 200);
            } else {
                await setupOptimizedVideo(videoRef.current, stream, deviceInfo);
                setShowCamera(true);
                scrollToCameraView();
            }

            console.log('🎉 Optimized camera setup completed successfully!');

        } catch (error) {
            console.error('❌ Optimized camera setup failed:', error);

            if (deviceInfo.isIOSPWA) {
                setCameraError('iOS PWA Camera Failed After All Attempts');
                setShowIOSPWAModal(true);
                return;
            }

            setCameraError(error.message);
        }
    }

    function stopCamera() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setShowCamera(false);
        setCameraError(null);
    }

    function capturePhoto() {
        if (!videoRef.current || !canvasRef.current || !streamRef.current) {
            alert('Camera not ready');
            return;
        }

        try {
            captureOptimizedImage(videoRef.current, canvasRef.current).then(blob => {
                if (blob) {
                    const imageUrl = URL.createObjectURL(blob);
                    setCapturedImage(imageUrl);
                    stopCamera();
                    processImage(blob);
                }
            });
        } catch (error) {
            console.error('❌ Optimized capture failed:', error);
            alert('Failed to capture image. Please try again.');
        }
    }

    async function processImage(imageFile) {
        setIsProcessing(true);
        setStep('processing');
        setOcrProgress(0);
        setProcessingStatus('Initializing OCR...');

        try {
            const text = await processImageWithOptimizedOCR(
                imageFile,
                deviceInfo,
                (progress) => {
                    setOcrProgress(progress);
                    setProcessingStatus(`Extracting text... ${progress}%`);
                }
            );

            setProcessingStatus('Analyzing receipt...');

            const items = parseReceiptText(text);

            if (items.length === 0) {
                setProcessingStatus('Recording scan attempt...');
                await recordReceiptScanUsage(0, 'no-items-found');

                alert('❌ No items could be extracted from this receipt. This scan has been counted towards your monthly limit. Please try with a clearer image.');
                setStep('upload');
                return;
            }

            setProcessingStatus('Recording successful scan...');

            try {
                const recordResponse = await fetch(getApiUrl('/api/receipt-scan/usage'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        scanType: 'receipt',
                        itemsExtracted: items.length
                    })
                });

                if (!recordResponse.ok) {
                    console.error('Failed to record receipt scan usage');
                } else {
                    const recordData = await recordResponse.json();
                    console.log('Receipt scan usage recorded:', recordData);

                    if (recordData.usage.remaining !== 'unlimited') {
                        setProcessingStatus(`Scan successful! ${recordData.usage.remaining} scans remaining this month.`);
                    }
                }
            } catch (recordError) {
                console.error('Error recording receipt scan usage:', recordError);
            }

            setExtractedItems(items);
            setProcessingStatus('Complete!');
            setStep('review');

        } catch (error) {
            console.error('OCR processing error:', error);

            try {
                await recordReceiptScanUsage(0, 'processing-failed');
            } catch (recordError) {
                console.error('Failed to record failed scan:', recordError);
            }

            alert('❌ Error processing receipt. This scan has been counted towards your monthly limit. Please try again with a clearer image.');
            setStep('upload');
        } finally {
            setIsProcessing(false);
            setOcrProgress(0);
        }
    }

    async function recordReceiptScanUsage(itemsExtracted, scanType = 'receipt') {
        try {
            const response = await fetch(getApiUrl('/api/receipt-scan/usage'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    scanType,
                    itemsExtracted
                })
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to record usage: ${response.status}`);
            }
        } catch (error) {
            console.error('Error recording receipt scan usage:', error);
            throw error;
        }
    }

    function handleUploadButtonClick() {
        if (!checkUsageLimitsBeforeScan()) {
            return;
        }

        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }

    function handleReceiptFileUpload(event) {
        const file = event.target.files[0];
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
    }

    function parseReceiptText(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const items = [];

        const pricePattern = /\$?(\d+\.\d{2})/;
        const upcPattern = /\b\d{12,14}\b/;
        const quantityPattern = /(\d+)\s*@\s*\$?(\d+\.\d{2})/;

        const skipPatterns = [
            /^walmart$/i, /^target$/i, /^kroger$/i, /^publix$/i, /^safeway$/i,
            /^hy-vee$/i, /^hyvee$/i, /^sam's club$/i, /^sams club$/i, /^costco$/i,
            /^trader joe's$/i, /^trader joes$/i, /^smith's$/i, /^smiths$/i,
            /^save money live better$/i, /^supercenter$/i,
            /^neighborhood\s+grocery\s+store$/i, /^your\s+neighborhood$/i,
            /^(thank you|receipt|store|phone|address)$/i,
            /^\d{2}\/\d{2}\/\d{4}$/, /^[\d\s\-\(\)]+$/,
            /^(debit|credit|card|cash|tend|tender)$/i,
            /^(debit tend|credit tend|cash tend)$/i,
            /^(payment|transaction|approval)$/i,
            /^(ref|reference|auth|authorization)$/i,
            /^(visa|mastercard|amex|discover|american express)$/i,
            /^(visa credit|visa debit|mastercard credit)$/i,
            /^total\s+purchase$/i,
            /^total\s+amount$/i, /^grand\s+total$/i, /^final\s+total$/i,
            /^order\s+total$/i, /^(sub-total|subtotal|sub total)$/i,
            /^(net amount|netamount|net)$/i, /^(total|amount)$/i,
            /^subtotal\s*\[\d+\]$/i, /^regular\s+price$/i, /^reg\s+price$/i,
            /^was\s+\$?\d+\.\d{2}$/i, /^sale\s+price$/i, /^compare\s+at$/i,
            /^retail\s+price$/i, /^t\s+s\s+ia\s+tax\s+.*$/i,
            /^[a-z]\s+s\s+[a-z]{2}\s+tax\s+.*$/i, /^tax\s+[\d\s]+$/i,
            /^tex\s+[\d\s]+$/i, /^t\s+[\d\s]+$/i,
            /^\d+\.\d+\s+on\s+\$?\d+\.\d{2}$/i,
            /^[a-z]\s+x?\s+\d+\.\d+\s+@\s+\d+\.\d+%?\s*=?\s*\d*\.?\d*$/i,
            /^[a-z]\s+\d+\.\d+\s+@\s+\d+\.\d+%?\s*=?\s*\d*\.?\d*$/i,
            /^t\s+\d+\.\d+\s+@\s+\d+\.\d+%?\s*=?\s*\d*\.?\d*$/i,
            /^\d+\.\d+\s+@\s+\d+\.\d+%\s*=\s*\d+\.\d+$/i,
            /^[a-z]\s+x\s+\d+\.\d+\s+@\s+\d+\s+\d+\s+\d+$/i,
            /^[a-z]\s+x\s+\d+\s+\d+\s+\d+\s+\d+$/i,
            /^[a-z]\s+[a-z]\s+\d+\s+\d+\s+\d+$/i,
            /^[\d\s]{15,}$/, /^\d{10,}$/,
            /^\d+\s+ea\s+\d+$/i, /^\d+\s+each\s+\d+$/i,
            /^\d+\s+@\s+\$?\d+\.\d{2}\s+ea$/i, /^\d+\s+@\s+\$?\d+\.\d{2}$/i,
            /^\d+\s+ea$/i, /^ea$/i, /^\d+%?\s*(off|discount|save)$/i,
            /^\(\$\d+\.\d{2}\)$/i, /^-\$?\d+\.\d{2}$/i,
            /^\d+\.\d{2}-[nt]$/i, /^.*-\$?\d+\.\d{2}$/i,
        ];

        console.log(`📄 Processing ${lines.length} lines from receipt...`);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
            const next2Line = i < lines.length - 2 ? lines[i + 2] : '';
            const prevLine = i > 0 ? lines[i - 1] : '';

            if (skipPatterns.some(pattern => pattern.test(line))) {
                console.log(`📋 Skipping pattern match: ${line}`);
                continue;
            }

            const priceMatch = line.match(pricePattern);
            if (priceMatch) {
                const price = parseFloat(priceMatch[1]);

                if (price > 100) {
                    console.log(`📋 Skipping high price line (likely total): ${line}`);
                    continue;
                }

                if (price < 0.10) {
                    console.log(`📋 Skipping very low price (likely fee): ${line}`);
                    continue;
                }

                let nameMatch = line;
                let itemPrice = price;
                let quantity = 1;
                let unitPrice = price;

                if (nextLine && nextLine.match(/^\d+\s+ea\s+\d+$/i)) {
                    const qtyMatch = nextLine.match(/(\d+)\s+ea\s+(\d+)/i);
                    if (qtyMatch) {
                        quantity = parseInt(qtyMatch[1]);
                        unitPrice = price / quantity;
                        itemPrice = price;
                        console.log(`📋 Found quantity info in next line (Ea pattern): ${quantity} ea, paid ${itemPrice}, unit price ${unitPrice.toFixed(2)}`);
                    }
                }

                nameMatch = line.replace(pricePattern, '').trim();
                nameMatch = cleanItemName(nameMatch);

                if (nameMatch && nameMatch.length > 2 &&
                    !nameMatch.match(/^\d+\.?\d*$/) &&
                    !nameMatch.match(/^[tx]\s*\d/i) &&
                    !nameMatch.match(/^(visa|card|payment|total|balance|inst|sv)$/i)) {

                    console.log(`📋 Processing item: ${nameMatch} - Qty: ${quantity} @ ${unitPrice.toFixed(2)} = ${itemPrice.toFixed(2)}`);

                    const item = {
                        id: Date.now() + Math.random(),
                        name: nameMatch,
                        price: itemPrice,
                        quantity: quantity,
                        unitPrice: unitPrice,
                        upc: '',
                        category: guessCategory(nameMatch),
                        location: guessLocation(nameMatch),
                        rawText: line + (nextLine && nextLine.match(/^\d+\s+ea\s+\d+$/i) ? ` + ${nextLine}` : ''),
                        selected: true,
                        needsReview: false
                    };

                    items.push(item);

                    if (nextLine && nextLine.match(/^\d+\s+ea\s+\d+$/i)) {
                        i++;
                        console.log(`📋 Skipped next line as it was processed as quantity info: ${nextLine}`);
                    }
                } else {
                    console.log(`📋 Skipping line with insufficient name: "${nameMatch}" from "${line}"`);
                }
            }
        }

        console.log(`📋 Extracted ${items.length} items from receipt`);
        return combineDuplicateItems(items);
    }

    function combineDuplicateItems(items) {
        const upcGroups = {};
        const nameGroups = {};

        items.forEach(item => {
            if (item.upc && item.upc.length >= 11) {
                const cleanUPC = item.upc.replace(/\D/g, '');
                if (!upcGroups[cleanUPC]) {
                    upcGroups[cleanUPC] = [];
                }
                upcGroups[cleanUPC].push(item);
            } else {
                const cleanName = item.name.toLowerCase().trim();
                if (!nameGroups[cleanName]) {
                    nameGroups[cleanName] = [];
                }
                nameGroups[cleanName].push(item);
            }
        });

        const combinedItems = [];

        Object.values(upcGroups).forEach(group => {
            if (group.length === 1) {
                combinedItems.push(group[0]);
            } else {
                const firstItem = group[0];
                const totalQuantity = group.reduce((sum, item) => sum + item.quantity, 0);
                const totalPrice = group.reduce((sum, item) => sum + item.price, 0);
                const unitPrice = totalPrice / totalQuantity;

                const combinedItem = {
                    ...firstItem,
                    quantity: totalQuantity,
                    price: totalPrice,
                    unitPrice: unitPrice,
                    rawText: `${group.length} identical items combined (UPC): ${firstItem.rawText}`,
                    id: Date.now() + Math.random()
                };

                combinedItems.push(combinedItem);
                console.log(`Combined ${group.length} items with UPC ${firstItem.upc}: ${firstItem.name}`);
            }
        });

        Object.values(nameGroups).forEach(group => {
            if (group.length === 1) {
                combinedItems.push(group[0]);
            } else {
                const firstItem = group[0];
                const totalQuantity = group.reduce((sum, item) => sum + item.quantity, 0);
                const totalPrice = group.reduce((sum, item) => sum + item.price, 0);
                const unitPrice = totalPrice / totalQuantity;

                const combinedItem = {
                    ...firstItem,
                    quantity: totalQuantity,
                    price: totalPrice,
                    unitPrice: unitPrice,
                    rawText: `${group.length} identical items combined (name): ${firstItem.rawText}`,
                    id: Date.now() + Math.random()
                };

                combinedItems.push(combinedItem);
                console.log(`Combined ${group.length} items by name: ${firstItem.name}`);
            }
        });

        return combinedItems;
    }

    function cleanItemName(name) {
        name = name.replace(/\s+NF\s*$/i, '');
        name = name.replace(/\s+T\s*$/i, '');
        name = name.replace(/\s+HOME\s*$/i, '');
        name = name.replace(/\s*\d+\s*@\s*\$?\d+\.\d{2}.*$/i, '');
        name = name.replace(/^\d{10,}/, '').trim();
        name = name.replace(/\d+%:?/, '').trim();
        name = name.replace(/\(\$\d+\.\d{2}\)/, '').trim();
        name = name.replace(/[-\s]*[nt]$/i, '').trim();
        name = name.replace(/\s*-\s*$/, '').trim();
        name = name.replace(/[^\w\s\-&']/g, ' ');
        name = name.replace(/\s+/g, ' ');
        name = name.trim();

        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    function guessCategory(name) {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('milk') || nameLower.includes('yogurt')) {
            return 'Dairy';
        }
        if (nameLower.includes('bread') || nameLower.includes('bagel')) {
            return 'Breads';
        }
        if (nameLower.includes('apple') || nameLower.includes('banana')) {
            return 'Fresh Fruits';
        }
        if (nameLower.includes('chicken') || nameLower.includes('beef')) {
            return 'Fresh/Frozen Meat';
        }

        return 'Other';
    }

    function guessLocation(name) {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('frozen') || nameLower.includes('ice cream')) {
            return 'freezer';
        }
        if (nameLower.includes('milk') || nameLower.includes('yogurt')) {
            return 'fridge';
        }

        return 'pantry';
    }

    function updateItem(itemId, field, value) {
        setExtractedItems(prev => prev.map(item =>
            item.id === itemId ? {...item, [field]: value} : item
        ));
    }

    function toggleItemSelection(itemId) {
        setExtractedItems(prev => prev.map(item =>
            item.id === itemId ? {...item, selected: !item.selected} : item
        ));
    }

    function calculateUPCCheckDigit(upc12) {
        if (upc12.length !== 12) return null;

        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(upc12[i]);
            if (i % 2 === 0) {
                sum += digit * 1;
            } else {
                sum += digit * 3;
            }
        }

        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit;
    }

    async function lookupByUPC(item) {
        if (!item.upc) return;

        try {
            const response = await fetch(getApiUrl(`/api/upc/lookup?upc=${item.upc}`));
            if (!response.ok) {
                throw new Error('UPC lookup failed');
            }
            const data = await response.json();

            if (data && data.success && data.product && data.product.found) {
                if (data.product.name && data.product.name !== 'Unknown Product') {
                    updateItem(item.id, 'name', data.product.name);
                }
                if (data.product.category && data.product.category !== 'Other') {
                    updateItem(item.id, 'category', data.product.category);
                }
                if (data.product.brand) {
                    updateItem(item.id, 'brand', data.product.brand);
                }
                updateItem(item.id, 'needsReview', false);
                alert(`✅ Product found: ${data.product.name}`);
            } else {
                alert(`❌ Product not found for UPC ${item.upc}`);
            }
        } catch (error) {
            console.error('UPC lookup error:', error);
            alert('❌ Network error during UPC lookup.');
        }
    }

    async function addItemsToInventory() {
        const selectedItems = extractedItems.filter(item => item.selected);

        if (selectedItems.length === 0) {
            alert('Please select at least one item to add.');
            return;
        }

        setStep('adding');
        setProcessingStatus('Adding items to inventory...');

        try {
            const promises = selectedItems.map(item =>
                fetch(getApiUrl('/api/inventory'), {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        name: item.name,
                        brand: item.brand || '',
                        category: item.category,
                        quantity: item.quantity,
                        unit: 'item',
                        location: item.location,
                        upc: item.upc,
                        expirationDate: null
                    })
                })
            );

            await Promise.all(promises);
            setProcessingStatus('Complete!');
            alert(`✅ Successfully added ${selectedItems.length} items to your inventory!`);
            router.push('/inventory');

        } catch (error) {
            console.error('Error adding items:', error);
            alert('Error adding some items. Please try again.');
            setStep('review');
        }
    }

    function openReportModal() {
        setReportData({
            issue: '',
            description: '',
            email: session?.user?.email || '',
            receiptImage: capturedImage,
            additionalFiles: []
        });
        setShowReportModal(true);
    }

    function handleReportFileUpload(event) {
        const files = Array.from(event.target.files);
        const validFiles = files.filter(file => {
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const maxSize = 10 * 1024 * 1024; // 10MB

            if (!validTypes.includes(file.type)) {
                alert(`File ${file.name} is not a supported image type.`);
                return false;
            }

            if (file.size > maxSize) {
                alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                return false;
            }

            return true;
        });

        setReportData(prev => ({
            ...prev,
            additionalFiles: [...prev.additionalFiles, ...validFiles]
        }));
    }

    function removeFile(index) {
        setReportData(prev => ({
            ...prev,
            additionalFiles: prev.additionalFiles.filter((_, i) => i !== index)
        }));
    }

    async function submitIssueReport() {
        if (!reportData.issue || !reportData.description) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('issue', reportData.issue);
            formData.append('description', reportData.description);
            formData.append('email', reportData.email);
            formData.append('deviceInfo', JSON.stringify(deviceInfo));

            if (reportData.receiptImage) {
                const response = await fetch(reportData.receiptImage);
                const blob = await response.blob();
                formData.append('receiptImage', blob, 'receipt.jpg');
            }

            reportData.additionalFiles.forEach((file, index) => {
                formData.append(`additionalFile_${index}`, file, file.name);
            });

            const response = await fetch(getApiUrl('/api/receipt-issue-report'), {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('✅ Thank you! Your issue report has been sent. We\'ll work on improving the receipt scanner.');
                setShowReportModal(false);
            } else {
                throw new Error('Failed to send report');
            }
        } catch (error) {
            console.error('Error sending issue report:', error);
            alert('❌ Failed to send issue report. Please try again.');
        }
    }

    function resetScan() {
        stopCamera();

        setStep('upload');
        setCapturedImage(prevImage => {
            if (prevImage) {
                URL.revokeObjectURL(prevImage);
            }
            return null;
        });
        setExtractedItems([]);
        setIsProcessing(false);
        setOcrProgress(0);
        setProcessingStatus('');
        setCameraError(null);
        setShowIOSPWAModal(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

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
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-xl p-8 mb-8 border border-purple-200">
                            <div className="text-center mb-6">
                                <div className="text-6xl mb-4">📄✨</div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                    Receipt Scanning is a Gold Feature
                                </h2>
                                <p className="text-gray-700 max-w-2xl mx-auto">
                                    Save time by scanning grocery receipts to automatically add multiple items to your inventory at once.
                                    Advanced OCR technology extracts item names, quantities, and prices.
                                </p>
                            </div>

                            {/* Feature Benefits */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                    <div className="text-2xl mb-2">🔍</div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Smart OCR</h3>
                                    <p className="text-sm text-gray-600">Advanced text recognition extracts items automatically</p>
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
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Scan Limits by Plan</h3>
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

                    {/* Usage Info Display */}
                    {(() => {
                        const usageDisplay = getReceiptScanUsageDisplay();

                        return (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <div className="text-blue-600 mr-3 mt-0.5">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-blue-800">
                                            📄 Receipt Scanning ({(() => {
                                            if (usageDisplay.isUnlimited || usageDisplay.tier === 'admin') {
                                                return `${usageDisplay.current}`;
                                            }
                                            return `${usageDisplay.current}/${usageDisplay.limit}`;
                                        })()})
                                        </h3>
                                        <p className="text-sm text-blue-700 mt-1">
                                            {(() => {
                                                if (usageDisplay.isUnlimited || usageDisplay.tier === 'admin') {
                                                    return `Unlimited receipt scans on ${usageDisplay.tier} plan`;
                                                } else if (usageDisplay.current >= usageDisplay.limit) {
                                                    return (
                                                        <span className="text-red-600 font-medium">
                                        You've reached your {usageDisplay.tier} plan limit of {usageDisplay.limit} scans this month
                                    </span>
                                                    );
                                                } else if (usageDisplay.current >= (usageDisplay.limit * 0.8)) {
                                                    return (
                                                        <span className="text-orange-600">
                                        {usageDisplay.remaining} scan{usageDisplay.remaining !== 1 ? 's' : ''} remaining this month
                                    </span>
                                                    );
                                                } else {
                                                    return `${usageDisplay.remaining} scan${usageDisplay.remaining !== 1 ? 's' : ''} remaining this month on ${usageDisplay.tier} plan`;
                                                }
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

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
                                                            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd"
                                                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                                      clipRule="evenodd"/>
                                                            </svg>
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm text-blue-700">
                                                                <strong>📊 {usage.remaining} receipt scans remaining this month</strong>
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