'use client';

// file: /src/app/inventory/receipt-scan/page.js - v15 Multi-platform OCR with Scribe.js and MLKit

import {useEffect, useRef, useState} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import {useRouter} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {apiGet, apiPost, fetchWithSession} from '@/lib/api-config';
import {useSubscription} from '@/hooks/useSubscription';
import {FEATURE_GATES} from '@/lib/subscription-config';
import FeatureGate from '@/components/subscription/FeatureGate';
import {Capacitor} from '@capacitor/core';

export default function ReceiptScan() {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const emailReceiptInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const cameraContainerRef = useRef(null);

    // State management - ALL HOOKS FIRST
    const {data: session, status} = useSafeSession();
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
    const [receiptType, setReceiptType] = useState('paper');
    const [showDebugModal, setShowDebugModal] = useState(false);
    const [debugImageFile, setDebugImageFile] = useState(null);
    const [debugBase64Data, setDebugBase64Data] = useState('');

    // Platform and device detection state
    const [platformInfo, setPlatformInfo] = useState({
        isNative: false,
        isAndroid: false,
        isIOS: false,
        isWeb: true,
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

    // Enhanced platform detection effect
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isNative = Capacitor.isNativePlatform();
            const platform = Capacitor.getPlatform();
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
            const isIOSPWA = isIOS && isStandalone && !isNative;

            setPlatformInfo({
                isNative,
                isAndroid: isNative && platform === 'android',
                isIOS: isNative && platform === 'ios',
                isWeb: !isNative,
                isIOSPWA,
                isPWA: isStandalone,
                userAgent: navigator.userAgent,
                displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
                standalone: !!window.navigator.standalone
            });

            console.log('📱 Platform Detection:', {
                isNative,
                platform: isNative ? platform : 'web',
                isIOSPWA,
                isPWA: isStandalone,
                userAgent: navigator.userAgent.substring(0, 100) + '...'
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

    // Get usage info from subscription hook (unchanged)
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

    function checkUsageLimitsBeforeScan() {
        if (subscription.loading) {
            alert('⏳ Please wait while we check your scan limits...');
            return false;
        }

        if (subscription.isAdmin) {
            return true;
        }

        const usage = getReceiptScanUsage();
        if (!usage.canScan) {
            const limitMessage = usage.monthlyLimit === 'unlimited'
                ? 'Unexpected limit reached'
                : `You've reached your monthly limit of ${usage.monthlyLimit} receipt scans. Used: ${usage.currentMonth}/${usage.monthlyLimit}`;

            alert(`❌ ${limitMessage}\n\nUpgrade to Gold for 20 scans/month or Platinum for unlimited scanning!`);
            window.location.href = `/pricing?source=receipt-scan-limit&feature=receipt-scanning&required=gold`;
            return false;
        }

        return true;
    }

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
                        <div
                            className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading dashboard...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

// ===============================================
// SCRIBE-ENHANCED TESSERACT.JS IMPLEMENTATION
// ===============================================

    async function processImageWithSimpleTesseract(imageBlob, progressCallback) {
        console.log('🔍 Starting simple, reliable Tesseract.js OCR...');

        const configs = [
            {
                name: 'Standard',
                config: {
                    tessedit_pageseg_mode: '6',
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$/()@-: ',
                    preserve_interword_spaces: '1',
                    tessedit_ocr_engine_mode: '1',
                }
            },
            {
                name: 'Auto PSM',
                config: {
                    tessedit_pageseg_mode: '3', // Auto page segmentation
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$/()@-: ',
                    preserve_interword_spaces: '1',
                    tessedit_ocr_engine_mode: '1',
                }
            }
        ];

        for (let i = 0; i < configs.length; i++) {
            const {name, config} = configs[i];

            try {
                console.log(`📄 Trying ${name} configuration...`);
                setProcessingStatus(`Trying ${name} OCR configuration...`);

                const Tesseract = (await import('tesseract.js')).default;

                const worker = await Tesseract.createWorker('eng', 1, {
                    logger: (m) => {
                        if (m.status === 'recognizing text' && progressCallback) {
                            const baseProgress = i * 50;
                            const progress = Math.round(baseProgress + (m.progress * 45));
                            progressCallback(Math.min(progress, 90));
                        }
                    }
                });

                const {data: {text, confidence}} = await worker.recognize(imageBlob, config);
                await worker.terminate();

                console.log(`✅ ${name} Tesseract: ${Math.round(confidence)}% confidence, ${text.length} chars`);

                if (text.length > 50) { // If we got reasonable amount of text
                    if (progressCallback) progressCallback(100);
                    setProcessingStatus('OCR complete!');
                    return text;
                }

            } catch (error) {
                console.log(`❌ ${name} configuration failed:`, error.message);
                continue;
            }
        }

        throw new Error('All OCR configurations failed');
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
            // 🔧 ESLINT FIX: Proper object structure in map function
            const itemsToAdd = extractedItems.map((item) => {
                return {
                    name: item.name,
                    brand: item.brand || '',
                    category: item.category,
                    quantity: item.quantity,
                    unit: 'item',
                    location: item.location,
                    upc: item.upc,
                    expirationDate: null,
                    rawText: item.rawText,
                    unitPrice: item.unitPrice,
                    price: item.price,
                    // 🆕 PRICE TRACKING DATA
                    hasReceiptPriceData: item.hasReceiptPriceData || false,
                    receiptPriceEntry: item.receiptPriceEntry || null
                };
            });

            const response = await apiPost('/api/inventory/bulk-add', {
                items: itemsToAdd,
                source: 'receipt-scan-enhanced-ai',
                ocrEngine: 'Enhanced-AI-Modal',
                metadata: {
                    platform: platformInfo.isIOSPWA ? 'iOS-PWA' : platformInfo.isIOS ? 'iOS' : 'Web',
                    ocrMethod: 'ai-enhanced-modal',
                    priceTrackingEnabled: true
                }
            });

            if (response.ok) {
                const result = await response.json();
                setProcessingStatus('Complete!');

                // 🆕 ENHANCED SUCCESS MESSAGE WITH PRICE TRACKING INFO
                const priceTrackedCount = result.priceDataAdded || 0;
                let successMessage = `✅ Successfully added ${result.itemsAdded} items to your inventory!`;

                if (priceTrackedCount > 0) {
                    successMessage += `\n\n💰 Price tracking data added for ${priceTrackedCount} items!`;
                    successMessage += `\nYou can view price analytics in the Inventory → Price Analytics tab.`;
                }

                alert(successMessage);

                // Navigate based on whether price tracking was added
                if (priceTrackedCount > 0) {
                    router.push('/inventory?tab=analytics'); // Show analytics tab
                } else {
                    router.push('/inventory'); // Standard inventory view
                }
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add items');
            }

        } catch (error) {
            console.error('Error adding items:', error);
            alert(`Error adding items: ${error.message}`);
            setStep('review');
        }
    }

    // ===============================================
    // CAMERA FUNCTIONS (Web-only, enhanced for platform detection)
    // ===============================================

    function getOptimizedCameraConstraints(platformInfo) {
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

        if (platformInfo.isIOSPWA) {
            return iosPWAConstraints;
        } else if (platformInfo.isWeb) {
            return [mobileConstraints];
        } else {
            return [standardConstraints];
        }
    }

    async function initializeOptimizedCamera(platformInfo) {
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

        const constraintSets = getOptimizedCameraConstraints(platformInfo);
        let stream = null;
        let lastError = null;

        for (let i = 0; i < constraintSets.length; i++) {
            const constraints = constraintSets[i];
            console.log(`📷 Attempting camera with constraints ${i + 1}/${constraintSets.length}`);

            try {
                const timeout = platformInfo.isWeb ? 10000 : 5000;
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

    async function setupOptimizedVideo(videoElement, stream, platformInfo) {
        console.log('🎬 Setting up optimized video element...');

        if (!videoElement || !stream) {
            throw new Error('Video element or stream is null');
        }

        if (platformInfo.isIOSPWA) {
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
            const timeout = platformInfo.isIOSPWA ? 15000 : 8000;
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

            if (platformInfo.isIOSPWA) {
                videoElement.play().catch(e => console.log('Video autoplay prevented:', e));
            }
        });
    }

    function captureOptimizedImage(videoElement, canvasElement) {
        console.log('📸 Capturing optimized image for OCR...');

        if (!videoElement || !canvasElement) {
            throw new Error('Video element or canvas is null');
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

    // ===============================================
    // MAIN PROCESSING FUNCTION
    // ===============================================

    async function processImage(imageFile) {
        console.log('🔍 processImage called with:', imageFile);
        console.log('🔍 Image file size:', imageFile?.size);
        console.log('🔍 Image file type:', imageFile?.type);

        setIsProcessing(true);
        setStep('processing');
        setOcrProgress(0);

        if (receiptType === 'email') {
            setProcessingStatus('Processing email receipt screenshot with enhanced OCR...');
        } else {
            setProcessingStatus('Initializing OCR...');
        }

        // 🆕 CAPTURE DEBUG DATA
        setDebugImageFile(imageFile);

        try {
            // ✅ STEP 1: OCR PROCESSING
            console.log('🔍 Starting OCR processing...');
            const text = await processImageWithSimpleTesseract(
                imageFile,
                (progress) => {
                    setOcrProgress(progress);
                    if (progress < 90) {
                        setProcessingStatus(`Extracting text... ${progress}%`);
                    }
                }
            );

            console.log('✅ OCR completed, text length:', text.length);
            setProcessingStatus('Analyzing receipt...');

            // ✅ STEP 2: BASIC PARSING
            console.log('🔍 Starting basic parsing...');
            const processedText = receiptType === 'email' ? preprocessEmailReceiptText(text) : text;
            const basicItems = parseReceiptText(processedText);

            console.log(`✅ Basic parsing complete: extracted ${basicItems.length} items`);

            // ✅ STEP 3: AI ENHANCEMENT (COMPLETELY OPTIONAL - SKIP ON ANY ERROR)
            let finalItems = basicItems; // Start with basic items
            setProcessingStatus('Running mandatory AI enhancement...');

            console.log('🤖 FORCING AI enhancement for all receipts...');

            try {
                // Step 3a: Base64 conversion (required for AI)
                console.log('🔄 Converting image to base64 for AI...');
                setProcessingStatus('Converting image for AI analysis...');

                const testBase64 = await convertImageToBase64(imageFile);
                setDebugBase64Data(testBase64);

                console.log('✅ Base64 conversion successful:', {
                    length: testBase64.length,
                    hasValidChars: /^[A-Za-z0-9+/=]+$/.test(testBase64),
                    firstChars: testBase64.substring(0, 10)
                });

                // Step 3b: Import AI helper (required)
                console.log('📦 Importing AI enhancement module...');
                setProcessingStatus('Loading AI enhancement module...');

                const aiModule = await import('@/lib/ai/receipt-ai-helper');
                const enhanceReceiptParsingWithAI = aiModule.enhanceReceiptParsingWithAI;

                if (typeof enhanceReceiptParsingWithAI !== 'function') {
                    throw new Error('AI enhancement function not available - this is required');
                }

                console.log('✅ AI module loaded successfully');

                // Step 3c: Run AI enhancement (required) - INCREASED TIMEOUT
                console.log('🧠 Running AI enhancement analysis...');
                setProcessingStatus('AI analyzing receipt and enhancing item detection...');

                const storeContext = getStoreContextFromReceipt(processedText);
                console.log('🏪 Store context detected:', storeContext);

                // 🔧 INCREASED TIMEOUT: 45s → 2 minutes for large receipts
                const aiPromise = enhanceReceiptParsingWithAI(
                    processedText,
                    basicItems,
                    imageFile,
                    storeContext
                );

                // Enhanced timeout with progress updates
                let timeoutId;
                const timeoutPromise = new Promise((_, reject) => {
                    let elapsed = 0;
                    const totalTimeout = 120000; // 2 minutes (120 seconds)

                    const progressInterval = setInterval(() => {
                        elapsed += 5000; // Update every 5 seconds
                        const progress = Math.min(90, (elapsed / totalTimeout) * 90);

                        if (elapsed <= 30000) {
                            setProcessingStatus(`AI analyzing receipt structure... (${Math.round(elapsed/1000)}s)`);
                        } else if (elapsed <= 60000) {
                            setProcessingStatus(`AI resolving product names and details... (${Math.round(elapsed/1000)}s)`);
                        } else if (elapsed <= 90000) {
                            setProcessingStatus(`AI finalizing enhanced item data... (${Math.round(elapsed/1000)}s)`);
                        } else {
                            setProcessingStatus(`AI completing advanced processing... (${Math.round(elapsed/1000)}s)`);
                        }

                        if (elapsed >= totalTimeout) {
                            clearInterval(progressInterval);
                            reject(new Error(`AI enhancement timeout after ${totalTimeout/1000} seconds`));
                        }
                    }, 5000);

                    timeoutId = progressInterval;
                });

                // Add cleanup function
                const racePromises = [aiPromise, timeoutPromise];

                finalItems = await Promise.race(racePromises);

                // Clear the timeout interval if AI completes successfully
                if (timeoutId) {
                    clearInterval(timeoutId);
                }

                console.log(`🎉 AI enhancement SUCCESS: ${basicItems.length} basic → ${finalItems.length} enhanced items`);
                setProcessingStatus('AI enhancement complete - items verified and enhanced!');

                // Add AI confidence indicators
                finalItems = finalItems.map(item => ({
                    ...item,
                    aiEnhanced: true,
                    confidence: item.confidence || 0.85, // Default confidence if not provided
                    enhancementSource: 'AI'
                }));

            } catch (aiError) {
                console.error('💥 AI enhancement FAILED (this is bad):', {
                    error: aiError.message,
                    stack: aiError.stack?.substring(0, 300),
                    basicItemsCount: basicItems.length
                });

                // Enhanced error messages with better guidance
                if (aiError.message.includes('Base64') || aiError.message.includes('conversion')) {
                    setProcessingStatus('❌ AI enhancement failed: Image conversion error');
                    alert('❌ AI Enhancement Failed: Could not convert image for AI analysis. Please try with a different image format or compress the image.');
                } else if (aiError.message.includes('import') || aiError.message.includes('module')) {
                    setProcessingStatus('❌ AI enhancement failed: Service unavailable');
                    alert('❌ AI Enhancement Failed: AI service is currently unavailable. Please try again in a few minutes.');
                } else if (aiError.message.includes('timeout')) {
                    setProcessingStatus('❌ AI enhancement failed: Processing timeout');

                    // More helpful timeout message
                    const timeoutSeconds = aiError.message.match(/(\d+)\s+seconds/)?.[1] || '120';
                    alert(`❌ AI Enhancement Timeout: Your receipt took longer than ${timeoutSeconds} seconds to process. This can happen with very large receipts or during high server load.\n\n✅ Try again - most receipts process in 30-60 seconds.\n\n💡 Tip: If this keeps happening, try taking a photo of just the items section of your receipt.`);
                } else if (aiError.message.includes('Promise') || aiError.message.includes('constructor')) {
                    setProcessingStatus('❌ AI enhancement failed: Service compatibility issue');
                    alert('❌ AI Enhancement Failed: Service compatibility issue. Please refresh the page and try again.');
                } else {
                    setProcessingStatus('❌ AI enhancement failed: Unknown error');
                    alert(`❌ AI Enhancement Failed: ${aiError.message}.\n\nPlease try again or contact support if this persists.`);
                }

                // STOP THE PROCESS - Don't allow non-AI enhanced results
                console.log('🛑 Stopping process due to AI enhancement failure');
                setStep('upload');
                return;
            }

            // Ensure we have AI-enhanced items before proceeding
            if (!finalItems || finalItems.length === 0) {
                console.error('💥 AI enhancement returned no items');
                setProcessingStatus('❌ AI enhancement failed: No items detected');
                alert('❌ AI Enhancement Failed: No items could be detected. Please try with a clearer receipt image.');
                setStep('upload');
                return;
            }

            console.log(`✅ Proceeding with ${finalItems.length} AI-enhanced items`);

            setProcessingStatus('Enhancing item data...');

            finalItems = finalItems.map(item => {
                // Ensure UPC is properly formatted
                if (item.upc && typeof item.upc === 'string') {
                    // Clean UPC: remove non-digits, ensure proper length
                    const cleanUPC = item.upc.replace(/\D/g, '');
                    if (cleanUPC.length >= 6) {
                        item.upc = cleanUPC;
                    }
                }

                // Ensure price is properly formatted
                if (item.price && typeof item.price === 'number') {
                    item.price = Math.round(item.price * 100) / 100; // Round to 2 decimals
                    item.unitPrice = item.unitPrice || item.price / (item.quantity || 1);
                }

                // Add enhanced metadata
                item.processedBy = 'AI-Enhanced';
                item.extractionQuality = 'High';
                item.needsReview = item.confidence && item.confidence < 0.7;

                return item;
            });

            console.log('🔧 Item enhancement complete');

            // DEBUGGING: Log Enhanced Items for Verification
            console.log('📋 AI-ENHANCED ITEMS DETAILS:');
            finalItems.forEach((item, index) => {
                console.log(`${index + 1}. "${item.name}" - $${item.price}`, {
                    upc: item.upc,
                    confidence: item.confidence,
                    aiEnhanced: item.aiEnhanced,
                    needsReview: item.needsReview,
                    category: item.category
                });
            });

            setProcessingStatus(`✅ AI verification complete! ${finalItems.length} items enhanced and ready for review.`);


            // ✅ STEP 4: Handle no items found
            if (finalItems.length === 0) {
                console.warn('❌ No items extracted from receipt');
                setProcessingStatus('Recording scan attempt...');

                try {
                    await recordReceiptScanUsage(0, 'no-items-found');
                } catch (recordError) {
                    console.error('Failed to record usage:', recordError);
                }

                alert('❌ No items could be extracted from this receipt. This scan has been counted towards your monthly limit. Please try with a clearer image or check the debug modal for more information.');
                setStep('upload');
                return;
            }

            // ✅ STEP 5: PROCESS PRICE TRACKING (safely)
            setProcessingStatus('Processing price data...');

            const itemsWithPriceTracking = [];
            for (const item of finalItems) {
                try {
                    if (item.priceData && item.priceData.price > 0) {
                        await addPriceTrackingFromReceipt(item);
                        console.log(`💰 Added price tracking for: ${item.name} - $${item.priceData.price}`);
                    }
                    itemsWithPriceTracking.push(item);
                } catch (priceError) {
                    console.warn(`⚠️ Could not add price tracking for ${item.name}:`, priceError);
                    itemsWithPriceTracking.push(item); // Still add the item without price tracking
                }
            }

            // ✅ STEP 6: Record successful scan
            setProcessingStatus('Recording successful scan...');

            try {
                const recordResponse = await apiPost('/api/receipt-scan/usage', {
                    scanType: 'receipt',
                    itemsExtracted: itemsWithPriceTracking.length,
                    ocrEngine: 'Enhanced-Tesseract',
                    priceDataAdded: itemsWithPriceTracking.filter(item => item.priceData).length,
                    aiEnhanced: finalItems.length > basicItems.length
                });

                if (recordResponse.ok) {
                    const recordData = await recordResponse.json();
                    console.log('✅ Receipt scan usage recorded:', recordData);

                    if (recordData.usage && recordData.usage.remaining !== 'unlimited') {
                        setProcessingStatus(`Scan successful! ${recordData.usage.remaining} scans remaining this month.`);
                    } else {
                        setProcessingStatus('Scan successful!');
                    }
                } else {
                    console.error('Failed to record receipt scan usage, status:', recordResponse.status);
                }
            } catch (recordError) {
                console.error('Error recording receipt scan usage:', recordError);
                // Don't fail the whole process for usage recording errors
            }

            // ✅ STEP 7: Success!
            console.log(`🎉 Processing complete! ${itemsWithPriceTracking.length} items ready for review`);

            setExtractedItems(itemsWithPriceTracking);
            setProcessingStatus('Complete!');
            setStep('review');

        } catch (error) {
            console.error('❌ Complete processing error:', {
                message: error.message,
                stack: error.stack?.substring(0, 500) + '...',
                name: error.name
            });

            // Try to record the failed scan
            try {
                await recordReceiptScanUsage(0, 'processing-failed');
            } catch (recordError) {
                console.error('Failed to record failed scan:', recordError);
            }

            // User-friendly error message based on error type
            let errorMessage = '❌ Error processing receipt. ';

            if (error.message.includes('OCR') || error.message.includes('Tesseract')) {
                errorMessage += 'OCR text extraction failed. ';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage += 'Network error occurred. ';
            } else {
                errorMessage += 'An unexpected error occurred. ';
            }

            errorMessage += 'This scan has been counted towards your monthly limit. Please try again with a clearer image.';

            alert(errorMessage);
            setStep('upload');

        } finally {
            setIsProcessing(false);
            setOcrProgress(0);

            // Clean up any object URLs to prevent memory leaks
            setTimeout(() => {
                if (capturedImage && capturedImage.startsWith('blob:')) {
                    try {
                        URL.revokeObjectURL(capturedImage);
                    } catch (cleanupError) {
                        console.warn('Could not clean up object URL:', cleanupError);
                    }
                }
            }, 1000);
        }
    }

    async function recordReceiptScanUsage(itemsExtracted, scanType = 'receipt') {
        try {
            console.log(`📊 Recording usage: ${itemsExtracted} items, type: ${scanType}`);

            const response = await apiPost('/api/receipt-scan/usage', {
                scanType,
                itemsExtracted,
                ocrEngine: platformInfo.isAndroid ? 'MLKit' : 'Tesseract.js',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent.substring(0, 100) // First 100 chars only
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Usage recorded successfully:', result);
                return result;
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Error recording receipt scan usage:', {
                message: error.message,
                scanType,
                itemsExtracted
            });
            throw error;
        }
    }

    // 🆕 HELPER FUNCTION: Convert image to base64 (moved from receipt-ai-helper for debugging)
    async function convertImageToBase64(imageFile) {
        return new Promise((resolve, reject) => {
            if (!imageFile) {
                reject(new Error('No image file provided'));
                return;
            }

            console.log('📷 Converting image to base64...', {
                name: imageFile.name,
                size: imageFile.size,
                type: imageFile.type
            });

            const reader = new FileReader();

            reader.onload = function (event) {
                try {
                    const result = event.target.result;

                    if (!result || typeof result !== 'string') {
                        throw new Error('FileReader returned invalid result');
                    }

                    // Get the base64 string without the data:image/...;base64, prefix
                    const base64String = result.split(',')[1];

                    if (!base64String) {
                        throw new Error('Could not extract base64 data from result');
                    }

                    console.log('✅ Base64 conversion successful:', {
                        originalLength: result.length,
                        base64Length: base64String.length,
                        prefix: result.substring(0, 50)
                    });

                    resolve(base64String);
                } catch (error) {
                    console.error('❌ Base64 conversion failed:', error);
                    reject(error);
                }
            };

            reader.onerror = function (error) {
                console.error('❌ FileReader error:', error);
                reject(new Error('Failed to read image file'));
            };

            // Read the file as data URL (base64)
            reader.readAsDataURL(imageFile);
        });
    }

    /**
     * Extract store context from receipt text for AI enhancement
     */
    function getStoreContextFromReceipt(receiptText) {
        const text = receiptText.toLowerCase();

        const storePatterns = {
            'walmart': /walmart|wal-mart/i,
            'target': /target/i,
            'kroger': /kroger/i,
            'safeway': /safeway/i,
            'costco': /costco/i,
            'sams club': /sam'?s club/i,
            'trader joes': /trader joe'?s/i,
            'whole foods': /whole foods/i,
            'hy-vee': /hy-?vee/i,
            'meijer': /meijer/i
        };

        for (const [store, pattern] of Object.entries(storePatterns)) {
            if (pattern.test(text)) {
                return store;
            }
        }

        return 'Unknown Store';
    }

    /**
     * Add price tracking data from receipt scan
     */
    async function addPriceTrackingFromReceipt(item) {
        if (!item.priceData || !item.priceData.price) {
            return;
        }

        try {
            // We'll add the price data when the item is added to inventory
            // For now, just attach it to the item
            item.hasReceiptPriceData = true;
            item.receiptPriceEntry = {
                price: item.priceData.price,
                store: item.priceData.store,
                date: item.priceData.purchaseDate,
                size: item.priceData.size,
                unit: item.priceData.unit,
                notes: 'From receipt scan',
                isFromReceipt: true
            };

            console.log(`💰 Prepared price data for ${item.name}:`, item.receiptPriceEntry);

        } catch (error) {
            console.error('Error preparing price tracking data:', error);
            throw error;
        }
    }

    // ===============================================
    // CAMERA AND FILE HANDLING
    // ===============================================

    async function startCamera() {
        if (!checkUsageLimitsBeforeScan()) {
            return;
        }

        // Android native app - use native camera + ML Kit
        if (platformInfo.isNative && platformInfo.isAndroid) {
            console.log('🤖 Starting Android native camera...');

            try {
                console.log('🤖 Importing Capacitor Camera...');
                const {Camera, CameraResultType, CameraSource} = await import('@capacitor/camera');
                console.log('🤖 Camera imported successfully');

                console.log('🤖 Calling Camera.getPhoto...');
                const photo = await Camera.getPhoto({
                    resultType: CameraResultType.Uri, // Changed from Blob to Uri
                    source: CameraSource.Camera,
                    quality: 90,
                    allowEditing: false,
                    saveToGallery: false
                });

                console.log('🤖 Camera.getPhoto returned:', photo);
                console.log('🤖 Photo webPath:', photo.webPath);

                if (photo.webPath) {
                    console.log('🤖 Converting photo to blob...');
                    const response = await fetch(photo.webPath);
                    const imageBlob = await response.blob();
                    console.log('🤖 Blob created:', imageBlob.size, 'bytes');

                    if (imageBlob && imageBlob.size > 0) {
                        console.log('🤖 Setting receipt type and captured image...');
                        setReceiptType('paper');
                        setCapturedImage(URL.createObjectURL(imageBlob));

                        console.log('🤖 Calling processImage...');
                        await processImage(imageBlob);
                        console.log('🤖 processImage completed');
                    } else {
                        console.error('🤖 Invalid or empty image blob');
                        alert('Failed to capture image: Empty or invalid image');
                    }
                } else {
                    console.error('🤖 No webPath in photo result');
                    alert('Failed to capture image: No file path returned');
                }
                return;
            } catch (error) {
                console.error('❌ Android camera failed:', error);
                console.error('❌ Error details:', error.message, error.stack);
                setCameraError('Android camera access failed. Please try "Upload Image" instead.');
                return;
            }
        }

        // Web/PWA camera implementation (iOS PWA, Web browsers)
        setCameraError(null);

        try {
            const stream = await initializeOptimizedCamera(platformInfo);
            streamRef.current = stream;

            if (!videoRef.current) {
                console.warn('Video ref is null, waiting for DOM to be ready...');
                setShowCamera(true);

                setTimeout(async () => {
                    if (videoRef.current) {
                        await setupOptimizedVideo(videoRef.current, stream, platformInfo);
                        scrollToCameraView();
                    } else {
                        throw new Error('Video element not available after timeout');
                    }
                }, 200);
            } else {
                await setupOptimizedVideo(videoRef.current, stream, platformInfo);
                setShowCamera(true);
                scrollToCameraView();
            }

            console.log('🎉 Camera setup completed successfully!');

        } catch (error) {
            console.error('❌ Camera setup failed:', error);

            if (platformInfo.isIOSPWA) {
                setCameraError('iOS PWA camera permissions needed. Try "Upload Image" for reliable scanning.');
            } else {
                setCameraError(`Camera access failed: ${error.message}. Please try "Upload Image" instead.`);
            }
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
            console.error('❌ Capture failed:', error);
            alert('Failed to capture image. Please try again.');
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
        const file = event?.target?.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setReceiptType('paper'); // Standard paper receipt photo
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

    async function handleEmailReceiptFileUpload(event) {
        try {
            const file = event?.target?.files?.[0];
            if (!file) {
                console.log('No file selected');
                return;
            }

            console.log('Selected file:', file.name, file.type);

            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                // Handle text files (copied email content)
                setReceiptType('email');
                const reader = new FileReader();
                reader.onload = (e) => {
                    const textContent = e.target.result;
                    processTextReceipt(textContent);
                };
                reader.readAsText(file);
            } else {
                alert('Please select a text file (.txt) only. Copy the email content and paste it into a text file first.');
                if (emailReceiptInputRef.current) {
                    emailReceiptInputRef.current.value = '';
                }
            }
        } catch (error) {
            console.error('Error handling email receipt upload:', error);
            alert('Error processing file. Please try again.');
        }
    }

    function handleEmailReceiptUpload() {
        if (!checkUsageLimitsBeforeScan()) {
            return;
        }

        if (emailReceiptInputRef.current) {
            emailReceiptInputRef.current.click();
        }
    }

    // Add this new function for processing text files
    async function processTextReceipt(textContent) {
        setIsProcessing(true);
        setStep('processing');
        setProcessingStatus('Parsing text email receipt...');

        try {
            // Use email-specific preprocessing
            const processedText = preprocessEmailReceiptText(textContent);
            const items = parseEmailReceiptText(processedText);

            if (items.length === 0) {
                setProcessingStatus('Recording scan attempt...');
                await recordReceiptScanUsage(0, 'no-items-found');

                alert('❌ No items could be extracted from this text receipt. The format might not be supported yet.');
                setStep('upload');
                return;
            }

            setProcessingStatus('Recording successful scan...');

            try {
                const recordResponse = await apiPost('/api/receipt-scan/usage', {
                    scanType: 'text-receipt',
                    itemsExtracted: items.length,
                    ocrEngine: 'Text-Parser-HyVee'
                });

                if (!recordResponse.ok) {
                    console.error('Failed to record receipt scan usage');
                } else {
                    const recordData = await recordResponse.json();
                    console.log('Receipt scan usage recorded:', recordData);
                }
            } catch (recordError) {
                console.error('Error recording receipt scan usage:', recordError);
            }

            setExtractedItems(items);
            setProcessingStatus('Complete!');
            setStep('review');

        } catch (error) {
            console.error('Text receipt processing error:', error);
            alert('❌ Error processing text receipt. Please try again.');
            setStep('upload');
        } finally {
            setIsProcessing(false);
        }
    }

    // Add this new function to handle email receipt text parsing
    function preprocessEmailReceiptText(text) {
        console.log('📧 Preprocessing email receipt OCR text...');

        // Email receipts often have different patterns than paper receipts
        let preprocessedText = text;

        // Clean up and normalize
        preprocessedText = preprocessedText.replace(/\s+/g, ' ').trim();

        // Try to detect and fix common email receipt OCR errors
        // Split lines that have category headers concatenated at the end
        preprocessedText = preprocessedText
            .replace(/(\$\d+\.\d{2})\s+(HV\s+\w+\s+\w+\s+Scan\s+\(\d+\):)/g, '$1\n$2')
            .replace(/(\$\d+\.\d{2})\s+(Pop\s+\(\d+\):)/g, '$1\n$2')
            .replace(/(\$\d+\.\d{2})\s+(Scan\s+\w*)/g, '$1\n$2')
            .replace(/(\$\d+\.\d{2})\s+([A-Z][A-Za-z\s]+\s+\(\d+\):)/g, '$1\n$2')
            .replace(/Product Image\s+/gi, '\n') // Split at each product
            .replace(/\n+/g, '\n') // Clean up multiple newlines
            .split('\n')
            .filter(line => line.trim().length > 0) // Remove empty lines
            .filter(line => !line.match(/^(Btl Dep|Dairy|Grocery|Meat|Milk|Pop)\s*\(\d+\):/i)) // Remove category headers
            .join('\n');

        console.log('📧 After email receipt preprocessing:', preprocessedText);
        return preprocessedText;
    }

    // ===============================================
    // RECEIPT TEXT PARSING (unchanged from original)
    // ===============================================

    function parseReceiptText(text) {
        console.log('🔍 RAW OCR TEXT RECEIVED:');
        console.log('=====================================');
        console.log(text);
        console.log('=====================================');
        console.log(`📊 Total text length: ${text.length} characters`);

        // ENHANCED TEXT PREPROCESSING - Target-specific patterns
        let preprocessedText = text;

        // Split lines that have multiple price patterns (for Trader Joe's receipts)
        if (preprocessedText.includes('$') && preprocessedText.match(/\$\d+\.\d{2}\s+[A-Z]/)) {
            preprocessedText = preprocessedText.replace(/(\$\d+\.\d{2})\s+([A-Z])/g, '$1\n$2');
        }

        // First, clean up and normalize the text
        preprocessedText = preprocessedText
            .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs only, preserve newlines
            .replace(/\n+/g, '\n')   // Normalize multiple newlines to single newlines
            .trim();

        console.log('🔧 After initial cleanup:', preprocessedText);

        // TARGET-SPECIFIC PREPROCESSING - Only for paper receipts
        preprocessedText = preprocessedText
            // Fix price patterns that got mushed together like "$2.99270020094"
            .replace(/(\$\d+\.\d{2})(\d{8,})/g, '$1\n$2')

            // Split before product codes (8+ digits)
            .replace(/(\d{8,})\s+([A-Z]{2,})/g, '\n$1 $2')

            // Split after complete item patterns: "ITEM NF $PRICE"
            .replace(/([A-Z\s]+)\s+(NF|TP)\s+(\$\d+\.\d{2})/g, '$1 $2 $3\n')

            // Split before "Regular price" patterns
            .replace(/\s+(Regular\s+price|Regul\s+\w*\s+price)/gi, '\n$1')

            // Split before BOGO patterns
            .replace(/\s+(BOGO\w*\s+circle)/gi, '\n$1')

            // Split before bottle deposit
            .replace(/\s+(Bottle\s+Deposit\s+Fee)/gi, '\n$1')

            // Split quantity patterns like "2 @ $5.99 ea"
            .replace(/(\s+|:)\s*(\d+)\s*@?\s*\$(\d+\.\d{2})\s*ea/gi, '\n$2 @ $$3 ea')

            // Split before major sections
            .replace(/\s+(GROCERY|HOME|PHARMACY|SUBTOTAL|TOTAL|PAYMENT|AUTH|WHEN|RETURN)/gi, '\n$1')

            // Clean up multiple line breaks
            .replace(/\n+/g, '\n')
            .trim();

        // Add this AFTER the initial cleanup in parseReceiptText, around line 600:

        // Enhanced OCR cleanup for Sam's Club multi-item lines
        preprocessedText = preprocessedText
            // Split multiple E items on same line: "E UPC1 ITEM1 N E UPC2 ITEM2 N E UPC3 ITEM3 N"
            .replace(/([TFNO]+)\s+E\s+(\d{6,})/g, '$1\nE $2')

            // Split when UPC appears after tax code: "N 990415958" -> "N\n990415958"
            .replace(/([TFNO]+)\s+(\d{8,})/g, '$1\n$2')

            // Split gift cards from other items: "$25GPLAY 24.48 N E" -> "$25GPLAY 24.48 N\nE"
            .replace(/(\$\d+GPLAY\s+[\d.]+\s+[TFNO]+)\s+E/g, '$1\nE')

            // Remove trailing artifacts: "24.98 N E I" -> "24.98 N"
            .replace(/(\d+\.\d{2})\s+([TFNO]+)\s+([EI]\s*)+$/gm, '$1 $2')

            // Split before instant savings: "12.79 T V INST SV" -> "12.79 T\nV INST SV"
            .replace(/(\d+\.\d{2})\s+([TFNO]+)\s+(V\s+INST\s+SV)/gi, '$1 $2\n$3')

            // Split before other instant savings patterns
            .replace(/(\d+\.\d{2})\s+([TFNO]+)\s+(E\s+V\s+INST\s+SV)/gi, '$1 $2\n$3')
            .replace(/(\d+\.\d{2})\s+([TFNO]+)\s+(S\s+INST\s+SV)/gi, '$1 $2\n$3')

            // Enhanced splitting for I-prefixed items and multiple items
            .replace(/([TFNO]+)\s+I\s+(\d{6,})/g, '$1\nI $2')  // Split "N I 852120" -> "N\nI 852120"
            .replace(/([TFNO]+)\s+(\d{6,})\s+([A-Z]{3,})/g, '$1\n$2 $3')  // Split "N 165749 GNC" -> "N\n165749 GNC"
            .replace(/([A-Z]{4,}F)\s+(\d+\.\d{2})\s+([TFNO]+)\s+(\d{6,})/g, '$1 $2 $3\n$4')  // Split after complete items

            // Split before I-prefixed items in middle of line
            .replace(/(\d+\.\d{2})\s+([TFNO]+)\s+I\s+(\d{6,})/g, '$1 $2\nI $3')

            // Clean up store header issues: "EDWARD E" -> "EDWARD\nE"
            .replace(/(EDWARD|[A-Z]{4,})\s+E\s+(\d{8,})/g, '$1\nE $2')

            // Clean up multiple line breaks
            .replace(/\n+/g, '\n')
            .trim();

        // Enhanced header splitting for Sam's Club receipts
        preprocessedText = preprocessedText
            // Split store headers that got concatenated
            .replace(/(sams club|sam's club)(\s+Self Checkout)/gi, '$1\n$2')
            .replace(/(Self Checkout)(\s+\(\d{3}\))/gi, '$1\n$2')
            .replace(/(\(\d{3}\)\s*\d{3}\s*-\s*\d{4})(\s+[A-Z]{2,})/g, '$1\n$2')
            .replace(/(CEDAR RAPIDS,?\s+IA)(\s+\d{2}\/\d{2}\/\d{2,4})/gi, '$1\n$2')
            .replace(/(\d{2}\/\d{2}\/\d{2,4}\s+\d{2}:\d{2}\s+\d+\s+\d+\s+\d+\s+\d+)(\s+[A-Z]{2,})/g, '$1\n$2')
            .replace(/(EDWARD)(\s+I\s+\d+)/g, '$1\n$2')

        // Enhanced OCR cleanup for Sam's Club multi-item lines
        preprocessedText = preprocessedText
            // Split multiple E items on same line: "E UPC1 ITEM1 N E UPC2 ITEM2 N"
            .replace(/([TFNO]+)\s+E\s+(\d{6,})/g, '$1\nE $2')

            // Split when UPC appears after tax code: "N 990415958" -> "N\n990415958"
            .replace(/([TFNO]+)\s+(\d{8,})/g, '$1\n$2')

            // Split "T EI" patterns: "15.98 T EI 571277" -> "15.98 T\nEI 571277"
            .replace(/(\d+\.\d{2})\s+([TFNO]+)\s+(EI)\s+(\d{6,})/g, '$1 $2\n$3 $4')

            // Split multiple I-prefixed items: "25.98 T I 12956" -> "25.98 T\nI 12956"
            .replace(/(\d+\.\d{2})\s+([TFNO]+)\s+I\s+(\d{6,})/g, '$1 $2\nI $3')

            // NEW: Split duplicate I items: "T I 12956 ITEM 25.98 T I 12956" -> "T\nI 12956 ITEM 25.98 T\nI 12956"
            .replace(/(\d+\.\d{2})\s+([TFNO]+)\s+(I\s+\d{4,})/g, '$1 $2\n$3')

            // Split I items with UPC concatenated: "T I990356952" -> "T\nI990356952"
            .replace(/([TFNO]+)\s+I(\d{8,})/g, '$1\nI$2')

            // Split items that got concatenated with store header info
            .replace(/(EDWARD)\s+I\s+(\d{6,})/g, '$1\nI $2')
            .replace(/(SEIKO)\s+(\d+\.\d{2})\s+([TFNO]+)\s+(\d{8,})/g, '$1 $2 $3\n$4')

            // Clean up multiple line breaks
            .replace(/\n+/g, '\n')
            .trim();

        console.log('🔧 After Target-specific splitting:');
        console.log('=====================================');
        console.log(preprocessedText);
        console.log('=====================================');

        const lines = preprocessedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        console.log(`📋 Split into ${lines.length} lines (was ${text.split('\n').length} before preprocessing)`);

        // Log all lines for debugging
        console.log('📋 All lines after preprocessing:');
        lines.forEach((line, index) => {
            console.log(`Line ${index + 1}: "${line}"`);
        });

        const items = [];

        // Common patterns for receipt items
        const pricePattern = /\$?(\d+\.\d{2})/;
        const upcPattern = /\b\d{12,14}\b/;

        // COMPREHENSIVE skip patterns from v11/v12
        const skipPatterns = [
            // Skip obvious non-item lines
            /^(SUBTOTAL|TOTAL|PAYMENT|AUTH|WHEN|RETURN|AID|CODE)/i,
            /^(GROCERY|HOME|PHARMACY)$/i,
            /^(Regular\s+price|Regul\s+\w+\s+price)/i,
            /^(BOGO\d+%?\s+circle?)/i,
            /^(gottle\s+peposit\s+fee|bottle\s+deposit)/i,
            /^\d{2}\/\d{2}\/\d{4}/i, // Dates
            /^\d{2}:\d{2}\s+[AP]M/i, // Times
            /^[\d\s\-\(\)]{10,}$/i, // Long number sequences
            /^[A-Z]\s+[A-Z]\s+[A-Z]/i, // Single letter combinations like "A L E"

            // Target-specific skip patterns
            /^Hides\s+Nort/i, // OCR garbage at start
            /^Cedar\s+Rapids/i, // Store location
            /^pla\s+Cat\s+nad/i, // OCR garbage
            /^nil\s+A\s+LIVIN/i, // OCR garbage
            /^LIVIN\s+AEN\s+CLAN/i, // OCR garbage
            /^iw\s+GROUY\s+RY/i, // OCR garbage

            // Skip price comparison lines (these are not items to buy)
            /^Regu\s+al\s+price/i,
            /^R0GOS0\s+circle/i,
            /^circle\s+Noe/i,

            // Skip tax and total lines
            /IA\s+TAR.*on\s+\$\d+\.\d{2}/i,
            /SUBT?\s+OTAL/i,
            /Las\s+TA\s+TAX/i,

            // Skip payment lines
            /DEBT.*PAYMENT/i,
            /AID:\s+[A-Z0-9]+/i,
            /AUTH\s+CODE/i,
            // ============ STORE NAMES AND HEADERS (More precise) ============
            /^walmart$/i,  // Only "walmart" by itself, not lines containing walmart
            /^target$/i,   // Only "target" by itself
            /^kroger$/i,   // Only "kroger" by itself
            /^publix$/i,   // Only "publix" by itself
            /^safeway$/i,  // Only "safeway" by itself
            /^hy-vee$/i,   // Only "hy-vee" by itself
            /^hyvee$/i,    // Only "hyvee" by itself
            /^sam's club$/i, // Only "sam's club" by itself, not lines with products
            /^sams club$/i,  // Only "sams club" by itself
            /^costco$/i,     // Only "costco" by itself
            /^trader joe's$/i, // Only "trader joe's" by itself
            /^trader joes$/i,  // Only "trader joes" by itself
            /^smith's$/i,      // Only "smith's" by itself
            /^smiths$/i,       // Only "smiths" by itself

            // Store taglines and headers
            /^save money live better$/i,
            /^supercenter$/i,
            /^neighborhood\s+grocery\s+store$/i,
            /^your\s+neighborhood$/i,

            // Receipt metadata
            /^(thank you|receipt|store|phone|address)$/i,
            /^\d{2}\/\d{2}\/\d{4}$/,
            /^[\d\s\-\(\)]+$/,

            // ============ PAYMENT AND TRANSACTION LINES ============
            /^(debit|credit|card|cash|tend|tender)$/i,
            /^(debit tend|credit tend|cash tend)$/i,
            /^(payment|transaction|approval)$/i,
            /^(ref|reference|auth|authorization)$/i,
            /^(visa|mastercard|amex|discover|american express)$/i,
            /^(visa credit|visa debit|mastercard credit)$/i,

            // ============ TOTALS AND SUMMARIES - ENHANCED ============
            /^total\s+purchase$/i,           // NEW: "Total Purchase"
            /^total\s+amount$/i,             // NEW: "Total Amount"
            /^grand\s+total$/i,              // NEW: "Grand Total"
            /^final\s+total$/i,              // NEW: "Final Total"
            /^order\s+total$/i,              // NEW: "Order Total"
            /^(sub-total|subtotal|sub total)$/i,  // EXISTING: Subtotal variations
            /^(net amount|netamount|net)$/i,      // EXISTING: Net amount
            /^(total|amount)$/i,                  // EXISTING: Generic total
            /^subtotal\s*\[\d+\]$/i,             // EXISTING: Subtotal with numbers

            // ============ PRICING AND COMPARISON LINES - ENHANCED ============
            /^regular\s+price$/i,            // NEW: "Regular Price"
            /^reg\s+price$/i,               // NEW: "Reg Price"
            /^was\s+\$?\d+\.\d{2}$/i,       // NEW: "Was $X.XX"
            /^sale\s+price$/i,              // NEW: "Sale Price"
            /^compare\s+at$/i,              // NEW: "Compare At"
            /^retail\s+price$/i,            // NEW: "Retail Price"

            // ============ TAX LINES - ENHANCED ============
            /^t\s+s\s+ia\s+tax\s+.*$/i,      // NEW: "T S IA TAX ..." pattern
            /^[a-z]\s+s\s+[a-z]{2}\s+tax\s+.*$/i, // NEW: Generic state tax pattern
            /^tax\s+[\d\s]+$/i,              // EXISTING: Tax with numbers
            /^tex\s+[\d\s]+$/i,              // EXISTING: Tax misspelling
            /^t\s+[\d\s]+$/i,                // EXISTING: Short tax
            /^\d+\.\d+\s+on\s+\$?\d+\.\d{2}$/i, // NEW: Tax calculation format

            // ============ TAX CALCULATION PATTERNS - NEW ============
            /^[a-z]\s+x?\s+\d+\.\d+\s+@\s+\d+\.\d+%?\s*=?\s*\d*\.?\d*$/i, // "E X 23.93 @ 6.0008 144"
            /^[a-z]\s+\d+\.\d+\s+@\s+\d+\.\d+%?\s*=?\s*\d*\.?\d*$/i,      // "E 23.93 @ 6.000% = 1.44"
            /^t\s+\d+\.\d+\s+@\s+\d+\.\d+%?\s*=?\s*\d*\.?\d*$/i,          // "T 23.93 @ 6.000% = 1.44"
            /^\d+\.\d+\s+@\s+\d+\.\d+%\s*=\s*\d+\.\d+$/i,                 // "23.93 @ 6.000% = 1.44"
            /^[a-z]\s+x\s+\d+\.\d+\s+@\s+\d+\s+\d+\s+\d+$/i,             // OCR garbled tax line

            // ============ PRODUCT CODES AND UPC PATTERNS - ENHANCED ============
            /^[a-z]\s+x\s+\d+\s+\d+\s+\d+\s+\d+$/i,  // NEW: "E X 6 0008 144" pattern
            /^[a-z]\s+[a-z]\s+\d+\s+\d+\s+\d+$/i,    // NEW: Similar product code patterns
            /^[\d\s]{15,}$/,                          // EXISTING: Long number strings
            /^\d{10,}$/,                             // NEW: Long product codes

            // ============ QUANTITY CONTINUATION LINES - ENHANCED ============
            /^\d+\s+ea\s+\d+$/i,             // NEW: "4 Ea 3" pattern
            /^\d+\s+each\s+\d+$/i,           // NEW: "4 Each 3" pattern
            /^\d+\s+@\s+\$?\d+\.\d{2}\s+ea$/i,  // EXISTING: Quantity @ price ea
            /^\d+\s+@\s+\$?\d+\.\d{2}$/i,       // EXISTING: Quantity @ price
            /^\d+\s+ea$/i,                      // EXISTING: Just quantity ea
            /^ea$/i,                            // EXISTING: Just "ea"

            // Additional patterns...
            /^manager\s+/i,
            /^\d{4}\s+\d{2}\/\d{2}\/\d{2}/i, // Store number + date
            /^st#\s*\d+/i, // Store number
            /^op#\s*\d+/i, // Operator number
            /^te#\s*\d+/i, // Terminal number
            /^tr#\s*\d+/i, // Transaction number
            /walmart\.com/i,
            /^balance\s+\$/i,
            /^change\s+\$/i,
            /^total\s+tax/i,
            /^account\s+#/i,
            /^approval\s+#/i,

            // ============ SAM'S CLUB SPECIFIC PATTERNS (More precise) ============
            /^membership$/i,
            /^advantage$/i,
            /^plus$/i,
            /^edward$/i, // Location names - but only by themselves
            /^cedar\s+rapids$/i, // Only address lines, not product lines
            /^\(\s*\d{3}\s*\)\s*\d{3}\s*-?\s*\d{4}$/i, // Phone numbers only
            /^\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/i, // Date/time stamps
            /^\d{4}\s+\d{5}\s+\d{3}\s+\d{4}$/i, // Transaction numbers only

            // FIXED: More specific instant savings patterns
            /^[ev]?\s*inst\s+sv\s+.*\d+\.\d{2}[-\s]*[nt]$/i, // Only discount lines ending with amount-N/T
            /^s\s+inst\s+sv\s+.*\d+\.\d{2}[-\s]*[nt]$/i, // S instant savings with discount
            /^[ev]\s+[ev]\s+inst\s+sv/i, // Multi-character instant savings

            /member\s*(ship|#|savings)$/i, // Only membership lines at end
            /you\s+saved$/i,               // Only "you saved" by itself
            /total\s+savings$/i,           // Only "total savings" by itself

            // TRADER JOE'S SPECIFIC PAYMENT PATTERNS
            /^visa\s*$/i,
            /^payment\s+card\s+purchase\s+transaction$/i,
            /^customer\s+copy$/i,
            /^type:\s+contactless$/i,
            /^aid:\s*\*+\d+$/i,
            /^tid:\s*\*+\d+$/i,
            /^no\s+cardholder\s+verification$/i,
            /^please\s+retain\s+for\s+your\s+records$/i,
            /^total\s+purchase$/i,
            /^\*+\d{4}$/i, // Card number fragments

            // SMITH'S (KROGER) SPECIFIC PAYMENT PATTERNS
            /^your\s+cashier\s+was/i,
            /^fresh\s+value\s+customer$/i,
            /^\*+\s*balance$/i,
            /^\d{3}-\d{3}-\d{4}$/i, // Phone numbers

            // ============ RECEIPT FOOTER INFORMATION ============
            /^(change due|amount due|balance)$/i,
            /^(customer|member|rewards)$/i,
            /^(save|saved|you saved)$/i,
            /^(coupon|discount|promotion)$/i,
            /^items\s+in\s+transaction$/i,
            /^balance\s+to\s+pay$/i,

            // ============ STORE OPERATION CODES AND IDS ============
            /^(st#|store|op|operator|te|terminal)$/i,
            /^(tc#|transaction|seq|sequence)$/i,
            /^[\d\s]{10,}$/,

            // ============ ITEMS SOLD COUNTER ============
            /^#?\s*items?\s+sold$/i,
            /^\d+\s+items?\s+sold$/i,

            // ============ BARCODE NUMBERS (STANDALONE) ============
            /^[\d\s]{15,}$/,

            // ============ HY-VEE SPECIFIC PATTERNS ============
            /btl\s+dep/i,
            /btl\.\s+dep/i,
            /bottle\s+deposit/i,
            /deposit/i,
            /^\.?\d+\s*fs?\s*btl\s*dep/i,
            /^[;]*\s*[xi]\s+\d+\.\d+\s*@\s*\d+\.\d+%\s*=\s*\d+\.\d+$/i,
            /^[ti]\s+\d+\.\d+\s*@\s*\d+\.\d+%\s*=\s*\d+\.\d+$/i,
            /^[;:]*\s*[xti]\s+\d+\.\d+\s*@/i,
            /^[xti]\s+\d+\.\d+\s*@\s*\d+\.\d+%/i,
            /^\d+\.\d+\s*@\s*\d+\.\d+%\s*=\s*\d+\.\d+$/i,
            /^manual\s*weight$/i,
            /^\d+\.\d+\s*lb\s*@\s*\d+\s*\d+\s*usd\/lb$/i,
            /^x\s+\d+\s+\d+\s+\d+$/i,
            /^[tx]\s+\d+(\s+\d+)*$/i,
            /^\d+\s+\d+\s+\d+\s+\d+$/i,
            /^\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}$/i,
            /^[\d\s]+\d{2}$/i,
            /^[a-z]\s+[\d\s]+$/i,
            /^@\s*\d+\.\d+%/i,
            /^=\s*[\d\s]+$/i,
            /^\d+\.\d+%\s*=?$/i,
            /employee\s*owned/i,
            /storeman/i,
            /group.*hy.*vee/i,
            /^[\d\s]{3,}$/,
            /^[a-z]{1,2}\s+[\d\s]+$/i,

            // ============ TARGET SPECIFIC PATTERNS ============
            /^regular\s+price$/i,
            /^reg\s+price$/i,
            /^was\s+\$?\d+\.\d{2}$/i,
            /^t\s*=\s*ia\s+tax$/i,
            /^[t]\s*-\s*ia\s+tax$/i,
            /^\*?\d{4}\s+debit\s+total$/i,
            /^aid[:;]\s*[a-z0-9]+$/i,
            /^auth\s+code[:;]$/i,
            /^us\s+debit$/i,
            /when\s+you\s+return/i,
            /return\s+credit/i,
            /promotional\s+discount/i,
            /applied\s+to\s+the/i,
            /saving\s+with\s+target/i,
            /target\s+circle/i,
            /got\s+easier/i,
            /open\s+the\s+target/i,
            /target\.com/i,
            /see\s+your\s+savings/i,
            /find\s+more\s+benefits/i,
            /\bapp\b.*\bvisit\b/i,
            /benefits/i,
            /blairs\s+ferry/i,
            /^nf$/i,
            /^t$/i,
            /^[a-z]$/i,
            /^[nt]$/i,
            /^grocery$/i,
            /^home$/i,
            /^electronics$/i,
            /^clothing$/i,

            // ============ TRADER JOE'S SPECIFIC PATTERNS ============
            /^items\s+in\s+transaction[:;]?\s*\d+$/i,
            /^balance\s+to\s+pay$/i,
            /^merchant\s+copy$/i,
            /^type[:;]\s*(contactless|chip|swipe)$/i,
            /^aid[:;]\s*\*+$/i,
            /^tid[:;]\s*\*+$/i,
            /^nid[:;]\s*\*+$/i,
            /^mid[:;]\s*\*+$/i,
            /^auth\s+code[:;]$/i,
            /^approval\s+code$/i,
            /^please\s+retain$/i,
            /^retain\s+for$/i,
            /^for\s+your\s+records$/i,

            // ============ SMITH'S (KROGER) SPECIFIC PATTERNS ============
            /^\d+\s+s\.\s+maryland\s+pkwy$/i,
            /^chec\s+\d+$/i,
            /^kroger\s+plus$/i,
            /^fuel\s+points$/i,
            /^you\s+earned$/i,
            /^points\s+earned$/i,
            /^\d+\.\d+\s+lb\s*@\s*\$?\d+\.\d+\s*\/\s*lb$/i,
            /^wt\s+.*lb$/i,
            /^\d+\.\d+\s*\/\s*lb$/i,
            /^\*+\s*balance$/i,
            /^balance\s*\*+$/i,
            /^f$/i,
            /^[f|t]\s*$/i,
            /^ro\s+lrg$/i,
            /^darnc[n|g]$/i,
            /^spwd\s+gr$/i,

            // ============ GENERIC PATTERNS ============
            /^\d+\.\d+\s*x\s*\$?\d+\.\d{2}$/i,
            /^\d+\.?\d*x?$/i,
            /^\d+\.?\d*\s*(lb|lbs|oz|kg|g|each|ea)$/i,
            /^\d+\s+.*\d+%.*\(\$\d+\.\d{2}\)$/i,
            /fuel\s*saver/i,
            /fuel\s*reward/i,
            /\d+\s+fuel\s+saver/i,
            /hormel\s*loins/i,
            /\d+\s+hormel\s*loins/i,
            /^(ia|iowa)\s+state$/i,
            /^linn\s+county$/i,
            /^[\w\s]+county\s+[\w\s]+\s+\d+\.\d+%$/i,
            /^[\w\s]+state\s+[\w\s]+\s+\d+\.\d+%$/i,
            /bottom\s*of\s*cart/i,
            /spend\s*\$?\d+/i,
            /\d+x\s*\d+of\d+/i,
            /^payment\s*information$/i,
            /^total\s*paid$/i,
            /^[a-z]\s*—?\s*$/i,
            /^\d+x\s*\$\d+\.\d+\s*[a-z]\s*—?\s*$/i,
            /deals\s*&?\s*coupons/i,
            /view\s*coupons/i,

            // ============ WARRANTY AND EXTENDED PROTECTION ============
            /warranty/i,
            /extended\s+protection/i,
            /protection\s+plan/i,
            /^\d+\s*yr\s+.*wty/i,        // "3YR AST WTY"
            /^\d+\s*year\s+.*warranty/i,  // "3 YEAR WARRANTY"
            /^.*\s+wty\s+/i,             // Any line ending with "WTY"
            /service\s+plan/i,
            /geek\s+squad/i,

            // ============ STORE HEADERS AND INFO ============
            /^sams\s+club.*edward/i,     // Store header with name
            /^self\s+checkout/i,         // Self checkout info
            /^\(\s*\d{3}\s*\)\s*\d{3}\s*-?\s*\d{4}/i, // Phone numbers
            /cedar\s+rapids.*edward/i,   // Location with name

            // ============ NON-FOOD ITEMS (Pet food, supplements, etc.) ============
            /temptations/i,           // Cat treats
            /fancy\s+feast/i,         // Cat food
            /purina/i,                // Pet food brand
            /pedigree/i,              // Dog food brand
            /iams/i,                  // Pet food brand
            /science\s+diet/i,        // Pet food brand
            /gnc/i,                   // Supplements
            /vitamin/i,               // Vitamins/supplements
            /supplement/i,            // Supplements
            /protein\s+powder/i,      // Protein supplements
            /multivitamin/i,          // Vitamins
            /fish\s+oil/i,           // Supplements (unless cooking oil)
            /omega/i,                 // Supplements
            /probiotic/i,            // Supplements
            /^mm\s+pv/i,             // "MM PV" supplement pattern

            // Gift card patterns (Sam's Club, Target, etc.)
            /^\d+\s*\$\d+GPLAY/i,          // "990293119 $50GPLAY"
            /^\$\d+GPLAY/i,                // "$50GPLAY"
            /gift\s*card/i,                // Any "gift card" text

            // ============ DISCOUNT AND NEGATIVE AMOUNT PATTERNS ============
            /^\d+%?\s*(off|discount|save)$/i,
            /^\(\$\d+\.\d{2}\)$/i,
            /^-\$?\d+\.\d{2}$/i,
            /^\d+\.\d{2}-[nt]$/i,
            /\d+\.\d{2}-n$/i,
            /\d+\.\d{2}-t$/i,
            /^.*-\$?\d+\.\d{2}$/i,
            /^.*\s+-\$?\d+\.\d{2}$/i,
            /^.*\s+\$?-\d+\.\d{2}$/i,

            // ============ ADDITIONAL COMMON PATTERNS ============
            /^\d+\.\d+\s*@\s*\d+\.\d+%\s*=$/i,
            /^[tx]\s+\d+\.\d+\s*@$/i,
            /^\d+\.\d+%\s*=$/i,
            /^=\s*\d+\.\d+$/i,
            /^\d+\.\d+\s*lb\s*@$/i,
            /^\d+\.\d+\s*usd\/lb$/i,
            /voided\s*bankcard/i,
            /bank\s*card/i,
            /transaction\s*not\s*complete/i,
            /transaction\s*complete/i,
            /tenbe\s*due/i,
            /tender\s*due/i,
            /change\s*due/i,
            /amount\s*due/i,
            /balance\s*due/i,
            /debit\s*tend/i,
            /cash\s*tend/i,
            /terminal\s*#/i,
            /pay\s+from\s+primary/i,
            /purchase$/i,
            /^.*\s+tax\s+[\d\s]+$/i,
            /^.*\s+savings\s+[\d\s]+$/i,
            /^total\s+purchase\s+[\d\s]+$/i,
        ];

        console.log(`📄 Processing ${lines.length} lines from receipt...`);

        // Process lines with enhanced context awareness from v11/v12
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

            // Skip common header/footer patterns
            if (skipPatterns.some(pattern => pattern.test(line))) {
                console.log(`📋 Skipping pattern match: ${line}`);
                continue;
            }

            // ENHANCED: Skip specific problematic lines BEFORE price processing
            if (line.match(/^(subtotal|sub-total|sub total|total purchase|regular price|reg price)$/i)) {
                console.log(`📋 Skipping known problematic line: ${line}`);
                continue;
            }

            // ENHANCED: Skip lines that contain these words even with additional text
            if (line.match(/^(subtotal|sub-total|sub total|total purchase|regular price|reg price)\s+/i)) {
                console.log(`📋 Skipping problematic line with additional text: ${line}`);
                continue;
            }

            // Skip bottle deposit lines specifically
            if (line.match(/btl\s+dep/i) || line.match(/bottle\s+deposit/i)) {
                console.log(`📋 Skipping bottle deposit: ${line}`);
                continue;
            }

            // Skip tax calculation lines - ENHANCED
            if (line.match(/^\d+\.\d+\s*@\s*\d+\.\d+%\s*=/i)) {
                console.log(`📋 Skipping tax calculation: ${line}`);
                continue;
            }

            // Skip zero-amount lines
            if (line.match(/\$?0\.00/i)) {
                console.log(`📋 Skipping zero amount: ${line}`);
                continue;
            }

            // Add this section BEFORE your existing pattern matching in parseReceiptText
            if (receiptType === 'email') {
                console.log('📧 Using email receipt parsing patterns...');

                // HyVee email receipt pattern: "ITEM NAME\nUPC\nqty × $price\n$total"
                const emailLines = lines;
                let i = 0;

                while (i < emailLines.length) {
                    const line = emailLines[i];

                    // Skip category headers and empty lines
                    if (line.match(/^(Btl Dep|Dairy|Grocery|Meat|Milk|Pop|Product Image)/i) || line.trim() === '') {
                        i++;
                        continue;
                    }

                    // Look for HyVee pattern: Item name, then UPC, then quantity info
                    const itemName = line.trim();
                    const upcLine = i + 1 < emailLines.length ? emailLines[i + 1] : '';
                    const qtyLine = i + 2 < emailLines.length ? emailLines[i + 2] : '';
                    const totalLine = i + 3 < emailLines.length ? emailLines[i + 3] : '';

                    // Check if this looks like a HyVee item pattern
                    const upcMatch = upcLine.match(/^\d{10,}$/);
                    const qtyMatch = qtyLine.match(/^(\d+)\s*×\s*\$(\d+\.\d{2})$/);
                    const totalMatch = totalLine.match(/^\$(\d+\.\d{2})$/);

                    if (itemName && upcMatch && qtyMatch && totalMatch) {
                        const quantity = parseInt(qtyMatch[1]);
                        const unitPrice = parseFloat(qtyMatch[2]);
                        const totalPrice = parseFloat(totalMatch[1]);
                        const upc = upcMatch[0];

                        // Verify the math is correct
                        if (Math.abs(quantity * unitPrice - totalPrice) < 0.01) {
                            console.log(`✅ HyVee email pattern: "${itemName}" - ${quantity} × $${unitPrice} = $${totalPrice}`);

                            const item = {
                                id: Date.now() + Math.random(),
                                name: cleanItemName(itemName),
                                price: totalPrice,
                                quantity: quantity,
                                unitPrice: unitPrice,
                                upc: upc,
                                taxCode: '',
                                category: guessCategory(itemName),
                                location: guessLocation(itemName),
                                rawText: `${itemName} (${upc}) ${quantity} × $${unitPrice}`,
                                selected: true,
                                needsReview: false
                            };

                            items.push(item);
                            i += 4; // Skip the next 3 lines we just processed
                            continue;
                        }
                    }

                    i++;
                }
                // If we found items with email patterns, return early
                if (items.length > 0) {
                    console.log(`📧 Found ${items.length} items using HyVee email patterns`);
                    console.log(`\n📋 FINAL RESULTS:`);
                    console.log(`📊 Extracted ${items.length} items from ${lines.length} lines`);
                    items.forEach((item, index) => {
                        console.log(`${index + 1}. "${item.name}" - $${item.price} (${item.category})`);
                    });
                    return combineDuplicateItems(items);
                }
            }

            // Look for Target item patterns specifically
            // Look for items with enhanced patterns
            let itemFound = false;
            let itemName = '';
            let price = 0;
            let unitPrice = 0;
            let quantity = 1;
            let upc = '';
            let taxCode = '';

            // Pattern 1: Product code + item name + tax code + price (universal)
            const pattern1 = line.match(/^(\d{8,})\s+([A-Z][A-Z\s&\d]+?)\s+(NF|TP|T|F)\s+\$(\d+\.\d{2})/i);
            if (pattern1) {
                const [, productCode, name, tax, priceStr] = pattern1;
                itemName = name.trim();
                price = parseFloat(priceStr);
                upc = (productCode && productCode.length >= 8) ? productCode : '';
                taxCode = tax || '';
                console.log(`✅ Pattern 1 (with code): "${itemName}" - $${price} (UPC: ${productCode || 'none'}, Tax: ${taxCode})`);
                itemFound = true;
            }

            // Pattern 2: Item name + tax code + price (universal)
            if (!itemFound) {
                const pattern2 = line.match(/^([A-Z][A-Z\s&\d]+?)\s+(NF|TP|T|F)\s+\$(\d+\.\d{2})/i);
                if (pattern2) {
                    const [, name, tax, priceStr] = pattern2;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    taxCode = tax || '';
                    console.log(`✅ Pattern 2 (no code): "${itemName}" - $${price} (Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 3: Simple item + price pattern
            if (!itemFound) {
                const pattern3 = line.match(/^([A-Z][A-Z\s&\d]+?)\s+\$(\d+\.\d{2})$/i);
                if (pattern3) {
                    const [, name, priceStr] = pattern3;
                    itemName = name.trim();
                    price = parseFloat(priceStr);

                    if (!itemName.match(/^(regular|regul|compare|was|sale|total|subtotal)/i) && price > 0.50 && price < 100) {
                        console.log(`✅ Pattern 3 (simple): "${itemName}" - $${price}`);
                        itemFound = true;
                    }
                }
            }

            // Pattern 4: Handle complex lines with multiple items (like line 14)
            if (!itemFound && line.includes('$') && line.length > 50) {
                // Try to extract the first item from a complex line
                const complexMatch = line.match(/(\d{8,})\s+([A-Z][A-Z\s&]+?)\s+(NF|TP)\s+\$(\d+\.\d{2})/i);
                if (complexMatch) {
                    const [, productCode, name, tax, priceStr] = complexMatch;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = (productCode && productCode.length >= 11) ? productCode : ''; // Safe check
                    taxCode = tax || '';
                    console.log(`✅ Pattern 4 (complex line): "${itemName}" - $${price} (UPC: ${productCode || 'none'}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 4: UPC + Name + Price + Tax (Sam's Club format, no $)
            const samPattern = line.match(/^(\d{8,})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([TFO]+)$/i);
            if (samPattern) {
                const [, productCode, name, priceStr, tax] = samPattern;
                itemName = name.trim();
                price = parseFloat(priceStr);
                upc = productCode;
                taxCode = tax || '';
                console.log(`✅ Sam's Club pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                itemFound = true;
            }

            // Pattern 5: Name + UPC + Price + Tax (Hy-Vee format, no $)
            if (!itemFound) {
                const hyVeePattern = line.match(/^([A-Z][A-Z\s&\d]+?)\s+(\d{8,})\s+(\d+\.\d{2,3})\s+([TF]+)$/i);
                if (hyVeePattern) {
                    const [, name, productCode, priceStr, tax] = hyVeePattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Hy-Vee pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 6: Smith's/Kroger format - Name + Price + Tax (like "KRO LRG WHITE BAKT 1.49 T")
            if (!itemFound) {
                const smithsPattern = line.match(/^([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2})\s+([TF])$/i);
                if (smithsPattern) {
                    const [, name, priceStr, tax] = smithsPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    taxCode = tax || '';
                    console.log(`✅ Smith's pattern: "${itemName}" - $${price} (Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

// Pattern 7: Trader Joe's format - Name + $Price (like "CRACKERS SANDWICH EVERYT $3.49")
            if (!itemFound) {
                const traderjoePattern = line.match(/^([A-Z][A-Z\s&\d]+?)\s+\$(\d+\.\d{2})$/i);
                if (traderjoePattern) {
                    const [, name, priceStr] = traderjoePattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    console.log(`✅ Trader Joe's pattern: "${itemName}" - $${price}`);
                    itemFound = true;
                }
            }

// Pattern 8: Target format - Code + Name + Tax + Price (like "284020005 GG MILK NF $2.59")
            if (!itemFound) {
                const targetPattern = line.match(/^(\d{8,})\s+([A-Z][A-Z\s&\d]+?)\s+([NFTP]+)\s+\$(\d+\.\d{2})$/i);
                if (targetPattern) {
                    const [, productCode, name, tax, priceStr] = targetPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Target pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 9: Walmart format - Name + UPC + Tax + Price (like "MTN DEW BAJ 001200024075 F 2.38")
            if (!itemFound) {
                const walmartPattern = line.match(/^([A-Z][A-Z\s&\d]+?)\s+(\d{12,14})\s+([FTN])\s+(\d+\.\d{2})$/i);
                if (walmartPattern) {
                    const [, name, upcCode, tax, priceStr] = walmartPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = upcCode;
                    taxCode = tax || '';
                    console.log(`✅ Walmart pattern: "${itemName}" - $${price} (UPC: ${upcCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 10: Sam's Club with E prefix - E + UPC + Name + Price + Tax
            if (!itemFound) {
                const samEPattern = line.match(/^E\s+(\d{8,})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samEPattern) {
                    const [, productCode, name, priceStr, tax] = samEPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club E pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 10: Sam's Club with O tax code (like "0980037822 EVOOO 22.98 0")
            if (!itemFound) {
                const samOPattern = line.match(/^(\d{8,})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([O0]+)$/i);
                if (samOPattern) {
                    const [, productCode, name, priceStr, tax] = samOPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club O pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 11: Sam's Club with mixed tax codes (like "0980043835 CHTORTELLIN 10.93 0O")
            if (!itemFound) {
                const samMixedPattern = line.match(/^(\d{8,})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([TFO0]+)$/i);
                if (samMixedPattern) {
                    const [, productCode, name, priceStr, tax] = samMixedPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club mixed pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 12: Sam's Club with E prefix (like "E 990310096 BUFFALOSAUCF 3.91 N")
            if (!itemFound) {
                const samEPattern = line.match(/^E\s+(\d{8,})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samEPattern) {
                    const [, productCode, name, priceStr, tax] = samEPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club E pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 13: Sam's Club E with F suffix (like "E 990374575 TERIYAKI F 5.58 N")
            if (!itemFound) {
                const samEFPattern = line.match(/^E\s+(\d{8,})\s+([A-Z][A-Z\s&\d]+?)\s+F\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samEFPattern) {
                    const [, productCode, name, priceStr, tax] = samEFPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club E+F pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }
            // Pattern 14: Sam's Club quantity deals (like "0990065690 SAUSAGE 2 AT 1 FOR 13.84 27.68 O")
            if (!itemFound) {
                const samQuantityPattern = line.match(/^(\d{8,})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+)\s+AT\s+\d+\s+FOR\s+[\d.]+\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samQuantityPattern) {
                    const [, productCode, name, qty, totalPriceStr, tax] = samQuantityPattern;
                    itemName = name.trim();
                    price = parseFloat(totalPriceStr);
                    quantity = parseInt(qty);
                    unitPrice = price / quantity;
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club quantity pattern: "${itemName}" - ${quantity} @ $${unitPrice.toFixed(2)} = $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 15: Sam's Club with trailing artifacts (like "990310096 BUFFALOSAUCF 3.91 N E")
            if (!itemFound) {
                const samTrailingPattern = line.match(/^(\d{8,})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([TFNO]+)\s+[EI]*\s*$/i);
                if (samTrailingPattern) {
                    const [, productCode, name, priceStr, tax] = samTrailingPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club trailing pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 16: Sam's Club E with short UPC (like "E 336296 PICNIC PACKF 8.98 N")
            if (!itemFound) {
                const samEShortPattern = line.match(/^E\s+(\d{6,})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samEShortPattern) {
                    const [, productCode, name, priceStr, tax] = samEShortPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club E short pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 17: Sam's Club missing E prefix (expanded criteria)
            if (!itemFound) {
                const samMissingEPattern = line.match(/^(\d{8,})\s+([A-Z]{2,}\s*[A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samMissingEPattern) {
                    const [, productCode, name, priceStr, tax] = samMissingEPattern;
                    // Expanded Sam's Club product patterns
                    if (name.match(/^(NS|MM|KORBBQ|KORBBQWINGS|BUFFALO|TERIYAKI|PICNIC|FRUIT|ROASTED|STCKY|TONES|ITAL|CHIVES)/i)) {
                        itemName = name.trim();
                        price = parseFloat(priceStr);
                        upc = productCode;
                        taxCode = tax || '';
                        console.log(`✅ Sam's Club missing E pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                        itemFound = true;
                    }
                }
            }

            // Pattern 18: Sam's Club generic (for any missed items)
            if (!itemFound) {
                const samGenericPattern = line.match(/^(\d{8,})\s+([A-Z]{4,}[A-Z\s&\d]*?)\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samGenericPattern) {
                    const [, productCode, name, priceStr, tax] = samGenericPattern;
                    // Only if it looks like a product name (4+ consecutive letters at start)
                    if (name.length >= 4 && !name.match(/^(SUBTOTAL|TOTAL|PAYMENT|CREDIT|DEBIT)/i)) {
                        itemName = name.trim();
                        price = parseFloat(priceStr);
                        upc = productCode;
                        taxCode = tax || '';
                        console.log(`✅ Sam's Club generic pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                        itemFound = true;
                    }
                }
            }

            // Pattern 19: Sam's Club I prefix (like "I 852120 TEMPTATIONS 19.18 T")
            if (!itemFound) {
                const samIPattern = line.match(/^I\s+(\d{6,})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samIPattern) {
                    const [, productCode, name, priceStr, tax] = samIPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club I pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 20: Sam's Club short UPC (like "165749 GNC MM PV 31.38 T")
            if (!itemFound) {
                const samShortUPCPattern = line.match(/^(\d{6,7})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samShortUPCPattern) {
                    const [, productCode, name, priceStr, tax] = samShortUPCPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club short UPC pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Pattern 18: Sam's Club basic format - UPC + NAME + PRICE + TAX (like "980286664 DM WHL CORNF 7.78 N")
            if (!itemFound) {
                const samBasicPattern = line.match(/^(\d{8,})\s+([A-Z]{2,}[A-Z\s&\d]*?)\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samBasicPattern) {
                    const [, productCode, name, priceStr, tax] = samBasicPattern;
                    // Only if it looks like a food product name (2+ consecutive letters at start)
                    if (name.length >= 2 && !name.match(/^(SUBTOTAL|TOTAL|PAYMENT|CREDIT|DEBIT|AST|WTY)/i)) {
                        itemName = name.trim();
                        price = parseFloat(priceStr);
                        upc = productCode;
                        taxCode = tax || '';
                        console.log(`✅ Sam's Club basic pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                        itemFound = true;
                    }
                }
            }

            // Pattern 17: Sam's Club EI prefix (like "EI 571277 DM CUT G BNF 7.78 N")
            if (!itemFound) {
                const samEIPattern = line.match(/^EI\s+(\d{6,})\s+([A-Z][A-Z\s&\d]+?)\s+(\d+\.\d{2,3})\s+([TFNO]+)$/i);
                if (samEIPattern) {
                    const [, productCode, name, priceStr, tax] = samEIPattern;
                    itemName = name.trim();
                    price = parseFloat(priceStr);
                    upc = productCode;
                    taxCode = tax || '';
                    console.log(`✅ Sam's Club EI pattern: "${itemName}" - $${price} (UPC: ${productCode}, Tax: ${taxCode})`);
                    itemFound = true;
                }
            }

            // Create item if we found a valid match
            if (itemFound && itemName && price > 0) {
                itemName = cleanItemName(itemName);

                if (itemName.length > 2 &&
                    !itemName.match(/^(regular|regul|compare|was|sale|price|circle|bogo)/i) &&
                    !itemName.match(/^\d+/) &&
                    price > 0.50 && price < 100) {

                    console.log(`✅ Creating item: "${itemName}" - $${price} (qty: ${quantity})`);

                    const item = {
                        id: Date.now() + Math.random(),
                        name: itemName,
                        price: price,
                        quantity: quantity,
                        unitPrice: price / quantity,
                        upc: upc,
                        taxCode: taxCode,
                        category: guessCategory(itemName, taxCode),
                        location: guessLocation(itemName),
                        rawText: line,
                        selected: true,
                        needsReview: false
                    };

                    items.push(item);

                    // UNIVERSAL QUANTITY DETECTION
                    const linesToSkip = detectAndApplyQuantityInfo(items, lines, i);
                    i += linesToSkip;
                    continue;
                } else {
                    console.log(`❌ Rejected item (validation failed): "${itemName}" - $${price}`);
                    continue;
                }
            }
            console.log(`❌ No valid item pattern found: "${line}"`);
        }

        console.log(`\n📋 FINAL RESULTS:`);
        console.log(`📊 Extracted ${items.length} items from ${lines.length} lines`);
        items.forEach((item, index) => {
            console.log(`${index + 1}. "${item.name}" - $${item.price} (${item.category})`);
        });

        console.log(`📋 Extracted ${items.length} items from receipt`);
        const combinedItems = combineDuplicateItems(items);
        return filterFoodItemsOnly(combinedItems);
    }

    // Replace your parseEmailReceiptText function with this improved version
    function parseEmailReceiptText(text) {
        console.log('📧 Parsing email receipt text directly...');

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const items = [];

        console.log(`📧 Processing ${lines.length} lines from email receipt...`);

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // Skip pure category headers
            if (line.match(/^(Dairy|Frozen|Grocery|Lunchmeat|Meat|Packaged|Produce|HV\s+\w+|Pop|Scan|Btl\s+Dep)[\s\-]*[\w\s]*\s*\(\d+\):\s*$/i)) {
                console.log(`📧 Skipping category header: ${line}`);
                continue;
            }

            // Clean category headers and fuel saver info from lines
            line = line
                .replace(/\s+(Dairy|Frozen|Grocery|Lunchmeat[\w\s\/]*|Meat[\s\-]*[\w\s]*|Packaged|Produce)[\s\-]*[\w\s]*\s*\(\d+\):\s*$/i, '')
                .replace(/\s+\d{7}\s+Fuel\s+Saver\s+\.\d{2}:\s+\$\d+\.\d{2}/gi, '') // Remove fuel saver
                .trim();

            // Pattern 3: ITEM_NAME UPC_CODE quantity × $unitPrice [extra_discount_info] $totalPrice
            const itemPatternWithDiscountInfo = line.match(/^([A-Z\d\s&.\-]+?)\s+(\d{4,})\s+(\d+(?:\.\d{1,2})?)\s*×\s*\$(\d+\.\d{2})\s+.*?\s+\$(\d+\.\d{2})$/);

            if (itemPatternWithDiscountInfo) {
                const [, itemName, upc, qty, unitPrice, totalPrice] = itemPatternWithDiscountInfo;
                const quantity = parseFloat(qty);
                const unitPriceNum = parseFloat(unitPrice);
                const totalPriceNum = parseFloat(totalPrice);

                // Verify the math is correct (allow small rounding differences)
                if (Math.abs(quantity * unitPriceNum - totalPriceNum) < 0.05) {
                    console.log(`✅ Email item with discount info: "${itemName.trim()}" - ${quantity} × $${unitPriceNum} = $${totalPriceNum}`);

                    const item = {
                        id: Date.now() + Math.random(),
                        name: cleanItemName(itemName.trim()),
                        price: totalPriceNum,
                        quantity: quantity,
                        unitPrice: unitPriceNum,
                        upc: upc,
                        taxCode: '',
                        category: guessCategory(itemName),
                        location: guessLocation(itemName),
                        rawText: line,
                        selected: true,
                        needsReview: false
                    };

                    items.push(item);
                    continue;
                }
            }

            // Pattern 1: ITEM_NAME UPC_CODE quantity × $unitPrice $totalPrice (with UPC 4+ digits)
            const itemPatternWithUPC = line.match(/^([A-Z\d\s&.\-]+?)\s+(\d{4,})\s+(\d+(?:\.\d{1,2})?)\s*×\s*\$(\d+\.\d{2})\s+\$(\d+\.\d{2})$/);

            if (itemPatternWithUPC) {
                const [, itemName, upc, qty, unitPrice, totalPrice] = itemPatternWithUPC;
                const quantity = parseFloat(qty);
                const unitPriceNum = parseFloat(unitPrice);
                const totalPriceNum = parseFloat(totalPrice);

                // Verify the math is correct (allow small rounding differences)
                if (Math.abs(quantity * unitPriceNum - totalPriceNum) < 0.05) {
                    console.log(`✅ Email item with UPC: "${itemName.trim()}" - ${quantity} × $${unitPriceNum} = $${totalPriceNum}`);

                    const item = {
                        id: Date.now() + Math.random(),
                        name: cleanItemName(itemName.trim()),
                        price: totalPriceNum,
                        quantity: quantity,
                        unitPrice: unitPriceNum,
                        upc: upc,
                        taxCode: '',
                        category: guessCategory(itemName),
                        location: guessLocation(itemName),
                        rawText: line,
                        selected: true,
                        needsReview: false
                    };

                    items.push(item);
                    continue;
                } else {
                    console.log(`❌ Math doesn't match for: ${line} (${quantity} × ${unitPriceNum} ≠ ${totalPriceNum})`);
                }
            }

            // Pattern 2: ITEM_NAME quantity × $unitPrice $totalPrice (no UPC)
            const itemPatternNoUPC = line.match(/^([A-Z\d\s&.\-]+?)\s+(\d+(?:\.\d{1,2})?)\s*×\s*\$(\d+\.\d{2})\s+\$(\d+\.\d{2})$/);

            if (itemPatternNoUPC) {
                const [, itemName, qty, unitPrice, totalPrice] = itemPatternNoUPC;
                const quantity = parseFloat(qty);
                const unitPriceNum = parseFloat(unitPrice);
                const totalPriceNum = parseFloat(totalPrice);

                if (Math.abs(quantity * unitPriceNum - totalPriceNum) < 0.05) {
                    console.log(`✅ Email item no UPC: "${itemName.trim()}" - ${quantity} × $${unitPriceNum} = $${totalPriceNum}`);

                    const item = {
                        id: Date.now() + Math.random(),
                        name: cleanItemName(itemName.trim()),
                        price: totalPriceNum,
                        quantity: quantity,
                        unitPrice: unitPriceNum,
                        upc: '',
                        taxCode: '',
                        category: guessCategory(itemName),
                        location: guessLocation(itemName),
                        rawText: line,
                        selected: true,
                        needsReview: false
                    };

                    items.push(item);
                    continue;
                }
            }

            console.log(`📧 No pattern match for line: "${line}"`);
        }

        console.log(`📧 Final result: Extracted ${items.length} items from email receipt`);
        return combineDuplicateItems(items);
    }

    // Universal quantity detection - works for any product/store
    function detectAndApplyQuantityInfo(items, lines, currentIndex) {
        const line = lines[currentIndex];
        const nextLine = currentIndex < lines.length - 1 ? lines[currentIndex + 1] : '';

        // Look for quantity patterns in current or next line
        const quantityPatterns = [
            // Standard patterns
            /(\d+)\s*@\s*\$?(\d+\.\d{2})\s*ea/i,
            /(\d+)\s*@\s*\$?(\d+\.\d{2})\s*each/i,
            /(\d+)\s*x\s*\$?(\d+\.\d{2})/i,
            /(\d+)\s*for\s*\$?(\d+\.\d{2})/i,

            // Corrupted OCR patterns (common OCR errors)
            /(\d+)\s*@\s*\$?(\d+)(?:\s*ead?|ea|each)?/i, // "2 @ $5 ea" or "20 @ $3 ead"
            /(\d+)\s*@\s*(\d+\.\d{2})/i, // Missing $ sign
            /(\d+)\s*@\s*(\d+)\s*\d+/i, // "2 @ 5 99" -> "2 @ $5.99"
        ];

        let quantityInfo = null;

        // Check current line first
        for (const pattern of quantityPatterns) {
            const match = line.match(pattern);
            if (match) {
                quantityInfo = {
                    quantity: parseInt(match[1]),
                    unitPrice: parseFloat(match[2]),
                    source: 'current'
                };
                break;
            }
        }

        // Check next line if no match in current
        if (!quantityInfo && nextLine) {
            for (const pattern of quantityPatterns) {
                const match = nextLine.match(pattern);
                if (match) {
                    quantityInfo = {
                        quantity: parseInt(match[1]),
                        unitPrice: parseFloat(match[2]),
                        source: 'next'
                    };
                    break;
                }
            }
        }

        // If we found quantity info, apply it to the most recent item
        if (quantityInfo && items.length > 0) {
            const lastItem = items[items.length - 1];
            const calculatedTotal = quantityInfo.quantity * quantityInfo.unitPrice;

            // Verify the math makes sense (within $1 tolerance for OCR errors)
            if (Math.abs(calculatedTotal - lastItem.price) <= 1.0) {
                lastItem.quantity = quantityInfo.quantity;
                lastItem.unitPrice = quantityInfo.unitPrice;
                lastItem.rawText += quantityInfo.source === 'next' ? ` + ${nextLine}` : '';

                console.log(`✅ Applied quantity: ${quantityInfo.quantity} @ $${quantityInfo.unitPrice} = $${lastItem.price} for "${lastItem.name}"`);
                return quantityInfo.source === 'next' ? 1 : 0; // Return lines to skip
            } else {
                // Try to fix common OCR price errors
                const possiblePrices = [
                    quantityInfo.unitPrice + 0.99, // $5 -> $5.99
                    quantityInfo.unitPrice / 10, // $59 -> $5.90
                    Math.round(quantityInfo.unitPrice * 100) / 100, // Fix decimals
                ];

                for (const correctedPrice of possiblePrices) {
                    const correctedTotal = quantityInfo.quantity * correctedPrice;
                    if (Math.abs(correctedTotal - lastItem.price) <= 0.01) {
                        lastItem.quantity = quantityInfo.quantity;
                        lastItem.unitPrice = correctedPrice;
                        lastItem.rawText += quantityInfo.source === 'next' ? ` + ${nextLine}` : '';

                        console.log(`✅ Applied corrected quantity: ${quantityInfo.quantity} @ $${correctedPrice} = $${lastItem.price} for "${lastItem.name}"`);
                        return quantityInfo.source === 'next' ? 1 : 0;
                    }
                }
            }
        }

        return 0; // No lines to skip
    }

    // Filter out non-food items after parsing
    function filterFoodItemsOnly(items) {
        console.log(`🍎 Starting food-only filtering with ${items.length} items...`);

        const nonFoodKeywords = [
            // Cleaning supplies
            'lysol', 'glade', 'febreze', 'tide', 'downy', 'bleach', 'detergent', 'fabric softener',
            'dish soap', 'dishwasher', 'cleaner', 'disinfectant', 'wipes', 'sponges', 'paper towel',
            'toilet paper', 'tissue', 'napkin', 'towel', 'towels', 'kleenex', 'klnx',

            // Personal care
            'degree', 'deodorant', 'shampoo', 'conditioner', 'soap', 'toothpaste', 'toothbrush',
            'razor', 'shaving', 'lotion', 'makeup', 'cosmetic', 'perfume', 'cologne',

            // Health/pharmacy
            'vitamin', 'supplement', 'medicine', 'tylenol', 'advil', 'aspirin', 'bandage',
            'first aid', 'thermometer', 'coq10',

            // Pet supplies
            'tidy cats', 'cat litter', 'dog food', 'cat food', 'pet food', 'dog treat', 'cat treat',
            'pet toy', 'leash', 'collar',

            // Electronics/non-food
            'battery', 'charger', 'cable', 'electronics', 'phone', 'computer', 'tv',
            'warranty', 'wty', 'seiko', 'watch',

            // Add these to the nonFoodKeywords array:
            'warranty', 'wty', 'protection plan', 'extended protection', 'service plan',
            'seiko', 'watch', 'electronics', 'geek squad',

            // Household items
            'light bulb', 'extension cord', 'tool', 'hardware', 'garden', 'automotive',
            'motor oil', 'antifreeze'
        ];

        const filteredItems = items.filter(item => {
            const itemNameLower = item.name.toLowerCase();

            // Check if item contains any non-food keywords
            const isNonFood = nonFoodKeywords.some(keyword =>
                itemNameLower.includes(keyword)
            );

            if (isNonFood) {
                console.log(`🚫 Filtered out non-food item: "${item.name}"`);
                return false;
            }

            console.log(`✅ Keeping food item: "${item.name}"`);
            return true;
        });

        console.log(`🍎 Food filtering complete: ${items.length} items → ${filteredItems.length} food items`);
        return filteredItems;
    }

// Combine duplicate items function
    function combineDuplicateItems(items) {
        console.log(`📧 Starting combination process with ${items.length} items...`);

        // Debug: Log all items with their UPCs
        items.forEach((item, index) => {
            console.log(`📧 Item ${index + 1}: "${item.name}" - UPC: "${item.upc}" - Price: $${item.price}`);
        });

        const upcGroups = {};
        const nameGroups = {};

        // Group by UPC code first (most reliable for email receipts)
        items.forEach((item, index) => {
            if (item.upc && item.upc.length >= 4) {
                const cleanUPC = item.upc.trim(); // Don't remove digits, just trim whitespace
                console.log(`📧 Grouping item ${index + 1} by UPC "${cleanUPC}"`);

                if (!upcGroups[cleanUPC]) {
                    upcGroups[cleanUPC] = [];
                }
                upcGroups[cleanUPC].push(item);
            } else {
                // Items without UPC codes - group by exact name match
                const cleanKey = item.name.toLowerCase().trim();
                console.log(`📧 Grouping item ${index + 1} by name "${cleanKey}"`);

                if (!nameGroups[cleanKey]) {
                    nameGroups[cleanKey] = [];
                }
                nameGroups[cleanKey].push(item);
            }
        });

        console.log(`📧 UPC Groups:`, Object.keys(upcGroups).map(upc => `${upc}: ${upcGroups[upc].length} items`));
        console.log(`📧 Name Groups:`, Object.keys(nameGroups).map(name => `${name}: ${nameGroups[name].length} items`));

        const combinedItems = [];

        // Process UPC groups - combine identical UPCs
        Object.entries(upcGroups).forEach(([upc, group]) => {
            if (group.length === 1) {
                console.log(`📧 Single item with UPC ${upc}: ${group[0].name}`);
                combinedItems.push(group[0]);
            } else {
                const firstItem = group[0];
                const totalQuantity = group.reduce((sum, item) => sum + item.quantity, 0);
                const unitPrice = firstItem.unitPrice;
                const totalPrice = parseFloat((totalQuantity * unitPrice).toFixed(2));

                const combinedItem = {
                    ...firstItem,
                    quantity: totalQuantity,
                    price: totalPrice,
                    unitPrice: unitPrice,
                    rawText: `${group.length} identical items combined (UPC: ${upc})`,
                    id: Date.now() + Math.random()
                };

                combinedItems.push(combinedItem);
                console.log(`✅ Combined ${group.length} items with UPC ${upc}: ${firstItem.name} (${group.map(i => i.quantity).join('+')} = ${totalQuantity} total qty, $${totalPrice})`);
            }
        });

        // Process name groups (items without UPC)
        Object.entries(nameGroups).forEach(([name, group]) => {
            if (group.length === 1) {
                console.log(`📧 Single item by name: ${group[0].name}`);
                combinedItems.push(group[0]);
            } else {
                const firstItem = group[0];
                const totalQuantity = group.reduce((sum, item) => sum + item.quantity, 0);
                const unitPrice = firstItem.unitPrice;
                const totalPrice = parseFloat((totalQuantity * unitPrice).toFixed(2));

                const combinedItem = {
                    ...firstItem,
                    quantity: totalQuantity,
                    price: totalPrice,
                    unitPrice: unitPrice,
                    rawText: `${group.length} identical items combined (name match)`,
                    id: Date.now() + Math.random()
                };

                combinedItems.push(combinedItem);
                console.log(`✅ Combined ${group.length} items by name: ${firstItem.name} (${group.map(i => i.quantity).join('+')} = ${totalQuantity} total qty, $${totalPrice})`);
            }
        });

        console.log(`📧 Final combination result: ${items.length} items → ${combinedItems.length} items`);
        return combinedItems;
    }

// Enhanced cleanItemName function
    function cleanItemName(name) {
        console.log(`🧹 Cleaning name: "${name}"`);

        // Remove product codes and common artifacts
        name = name
            // Remove tax codes
            .replace(/\s+(NF|TP)\s*$/i, '')

            // Remove price information that got mixed in
            .replace(/\s+Regular\s+price.*$/i, '')
            .replace(/\s+\$\d+\.\d{2}.*$/i, '')

            // Remove product codes
            .replace(/^\d{8,}\s*/, '')

            // Remove quantity patterns
            .replace(/\s*\d+\s*@\s*\$?\d+\.\d{2}.*$/i, '')

            // Remove BOGO and circle text
            .replace(/\s+BOGO.*$/i, '')
            .replace(/\s+circle.*$/i, '')

            // Remove section indicators
            .replace(/\s+(HOME|GROCERY|PHARMACY)\s*$/i, '')

            // Clean up OCR artifacts
            .replace(/[^\w\s\-&']/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Fix common OCR errors
        name = name
            .replace(/\bgq\b/gi, 'GG')
            .replace(/\bcrers\b/gi, 'CRACKERS')
            .replace(/\bmuckers\b/gi, 'SMUCKERS')
            .replace(/\bjerrys\b/gi, "JERRY'S")
            .replace(/\b8\b/g, '&'); // Fix "BEN 8 JERRYS" to "BEN & JERRYS"

        // Capitalize properly
        const cleaned = name.split(' ')
            .map(word => {
                if (word.length <= 2) return word.toUpperCase();
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');

        console.log(`🧹 Cleaned result: "${cleaned}"`);
        return cleaned;
    }

// Enhanced guessCategory function
    function guessCategory(name, taxCode = '') {
        if (!name) return 'Other';

        const nameLower = name.toLowerCase();

        // Beverages
        if (nameLower.match(/\b(soda|pop|juice|coffee|tea|beer|wine|water|milk|almond milk|soy milk|oat milk)\b/)) {
            return 'Beverages';
        }

        // Dairy (but not milk beverages)
        if (nameLower.match(/\b(cheese|cheddar|mozzarella|parmesan|swiss|provolone|cream cheese|cottage cheese|sour cream|butter|yogurt|greek yogurt)\b/) && !nameLower.includes('milk')) {
            return 'Dairy';
        }

        // Fresh Fruits
        if (nameLower.match(/\b(apple|banana|orange|grape|strawberr|blueberr|raspberr|blackberr|peach|pear|cherry|plum|melon|watermelon|cantaloupe|kiwi|mango|pineapple|avocado|lemon|lime)\b/)) {
            return 'Fresh Fruits';
        }

        // Fresh Vegetables
        if (nameLower.match(/\b(lettuce|spinach|kale|broccoli|cauliflower|carrot|celery|onion|garlic|potato|tomato|cucumber|pepper|bell pepper|mushroom|zucchini|squash|cabbage|corn)\b/)) {
            return 'Fresh Vegetables';
        }

        // Meat & Poultry
        if (nameLower.match(/\b(chicken|turkey|duck)\b/)) {
            return 'Fresh/Frozen Poultry';
        }
        if (nameLower.match(/\b(beef|steak|ground beef|hamburger|roast)\b/)) {
            return 'Fresh/Frozen Beef';
        }
        if (nameLower.match(/\b(pork|ham|bacon|sausage|pepperoni)\b/)) {
            return 'Fresh/Frozen Pork';
        }
        if (nameLower.match(/\b(fish|salmon|tuna|cod|tilapia|shrimp|crab|lobster|seafood)\b/)) {
            return 'Fresh/Frozen Fish & Seafood';
        }
        if (nameLower.match(/\b(lamb|venison|rabbit)\b/)) {
            return nameLower.includes('lamb') ? 'Fresh/Frozen Lamb' :
                nameLower.includes('venison') ? 'Fresh/Frozen Venison' : 'Fresh/Frozen Rabbit';
        }

        // Breads & Bakery
        if (nameLower.match(/\b(bread|bun|roll|bagel|muffin|croissant|donut|cake|pie|cookie)\b/)) {
            return 'Breads';
        }

        // Pasta & Grains
        if (nameLower.match(/\b(pasta|spaghetti|macaroni|penne|linguine|rigatoni|lasagna|noodle)\b/)) {
            return 'Pasta';
        }
        if (nameLower.match(/\b(rice|quinoa|barley|oats|oatmeal|cereal|granola)\b/)) {
            return 'Grains';
        }

        // Canned/Jarred items
        if (nameLower.match(/\b(canned|can of|jarred)\b/)) {
            if (nameLower.match(/\b(bean|beans|chickpea|lentil)\b/)) return 'Canned/Jarred Beans';
            if (nameLower.match(/\b(tomato|sauce|marinara|salsa)\b/)) return 'Canned/Jarred Sauces';
            if (nameLower.match(/\b(corn|peas|green bean|carrot|beet)\b/)) return 'Canned/Jarred Vegetables';
            if (nameLower.match(/\b(peach|pear|pineapple|fruit)\b/)) return 'Canned/Jarred Fruit';
            if (nameLower.match(/\b(tuna|salmon|chicken|meat)\b/)) return 'Canned/Jarred Meat';
            return 'Canned/Jarred Meals';
        }

        // Frozen items
        if (nameLower.match(/\b(frozen)\b/)) {
            if (nameLower.match(/\b(berry|fruit|strawberr|blueberr)\b/)) return 'Frozen Fruit';
            if (nameLower.match(/\b(vegetable|peas|corn|broccoli|spinach)\b/)) return 'Frozen Vegetables';
            if (nameLower.match(/\b(meal|dinner|pizza|burrito)\b/)) return 'Frozen Meals';
            return 'Frozen Other Items';
        }

        // Condiments & Sauces
        if (nameLower.match(/\b(ketchup|mustard|mayo|mayonnaise|ranch|dressing|vinegar|oil|olive oil|hot sauce|bbq|barbecue)\b/)) {
            return 'Condiments';
        }

        // Spices & Seasonings
        if (nameLower.match(/\b(salt|pepper|oregano|basil|thyme|rosemary|paprika|cumin|chili|garlic powder|onion powder|cinnamon|vanilla)\b/)) {
            return 'Spices';
        }
        if (nameLower.match(/\b(seasoning|spice|herb)\b/)) {
            return 'Seasonings';
        }

        // Baking ingredients
        if (nameLower.match(/\b(flour|sugar|brown sugar|baking powder|baking soda|yeast|vanilla extract|cocoa|chocolate chip)\b/)) {
            return 'Baking & Cooking Ingredients';
        }

        // Snacks
        if (nameLower.match(/\b(chip|crisp|cracker|pretzel|popcorn|nut|peanut|cashew|almond|granola bar|candy|chocolate)\b/)) {
            return 'Snacks';
        }

        // Soups & Broths
        if (nameLower.match(/\b(soup|broth|stock|bouillon)\b/)) {
            if (nameLower.includes('bouillon')) return 'Bouillon';
            if (nameLower.match(/\b(broth|stock)\b/)) return 'Stock/Broth';
            return 'Soups & Soup Mixes';
        }

        // Eggs
        if (nameLower.match(/\b(egg|eggs)\b/)) {
            return 'Eggs';
        }

        // Default fallback
        return 'Other';
    }

    function guessLocation(name) {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('frozen') || nameLower.includes('ice cream')) {
            // Default frozen items to fridge freezer, but user can change to deep freezer
            return 'fridge-freezer';
        }
        if (nameLower.includes('milk') || nameLower.includes('yogurt') || nameLower.includes('cheese')) {
            return 'fridge';
        }
        if (nameLower.includes('spice') || nameLower.includes('seasoning') ||
            nameLower.includes('salt') || nameLower.includes('pepper')) {
            return 'kitchen';
        }

        return 'pantry';
    }

// ===============================================
// ITEM MANAGEMENT FUNCTIONS (unchanged)
// ===============================================

    function updateItem(itemId, field, value) {
        setExtractedItems(prev => prev.map(item => {
            if (item.id === itemId) {
                // Handle numeric fields properly
                if (field === 'price' || field === 'unitPrice') {
                    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
                    return {...item, [field]: numericValue};
                }
                if (field === 'quantity') {
                    const numericValue = typeof value === 'string' ? parseInt(value) || 1 : value;
                    return {...item, [field]: numericValue};
                }
                // For other fields, use value as-is
                return {...item, [field]: value};
            }
            return item;
        }));
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

        async function tryUPCLookup(upcCode) {
            const response = await apiGet(`/api/upc/lookup?upc=${upcCode}`);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            return data;
        }

        try {
            const originalUPC = item.upc;
            const upcVariations = [];
            let calculatedVariation = null;

            upcVariations.push(originalUPC);

            if (originalUPC.length === 12) {
                const checkDigit = calculateUPCCheckDigit(originalUPC);
                if (checkDigit !== null) {
                    calculatedVariation = originalUPC + checkDigit;
                    upcVariations.push(calculatedVariation);
                }
            }

            console.log(`Smart UPC lookup for ${originalUPC}. Calculated variation: ${calculatedVariation}`);

            for (const upcCode of upcVariations) {
                try {
                    const data = await tryUPCLookup(upcCode);

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

                        updateItem(item.id, 'upc', upcCode);
                        updateItem(item.id, 'needsReview', false);

                        let successMessage = `✅ Product found: ${data.product.name}`;
                        if (data.product.brand) {
                            successMessage += ` (${data.product.brand})`;
                        }
                        if (data.product.category && data.product.category !== 'Other') {
                            successMessage += `\nCategory: ${data.product.category}`;
                        }
                        if (upcCode !== originalUPC) {
                            successMessage += `\nCorrected UPC: ${originalUPC} → ${upcCode}`;
                        }

                        alert(successMessage);
                        return;
                    }
                } catch (error) {
                    console.log(`UPC ${upcCode} failed:`, error.message);
                    continue;
                }
            }

            alert(`❌ Product not found for UPC ${originalUPC}`);

        } catch (error) {
            console.error('UPC lookup error:', error);
            alert('❌ Network error during UPC lookup. Please check your connection and try again.');
        }
    }

// ===============================================
// REPORT AND MODAL FUNCTIONS (unchanged from original)
// ===============================================

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
            formData.append('deviceInfo', JSON.stringify(platformInfo));

            if (reportData.receiptImage) {
                const response = await fetch(reportData.receiptImage);
                const blob = await response.blob();
                formData.append('receiptImage', blob, 'receipt.jpg');
            }

            reportData.additionalFiles.forEach((file, index) => {
                formData.append(`additionalFile_${index}`, file, file.name);
            });

            const response = await fetchWithSession('/api/receipt-issue-report', {
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

// ===============================================
// RENDER FUNCTIONS AND MODALS
// ===============================================

    function DebugModal({isOpen, onClose, imageFile, base64Data}) {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">🔍 Receipt Processing Debug</h3>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-gray-900">Image File Info:</h4>
                                <div className="bg-gray-50 p-3 rounded text-sm">
                                    <p>Size: {imageFile?.size ? `${Math.round(imageFile.size / 1024)} KB` : 'N/A'}</p>
                                    <p>Type: {imageFile?.type || 'N/A'}</p>
                                    <p>Name: {imageFile?.name || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium text-gray-900">Base64 Data:</h4>
                                <div className="bg-gray-50 p-3 rounded text-sm">
                                    <p>Length: {base64Data?.length || 0} characters</p>
                                    <p>Has Data: {base64Data ? '✅ Yes' : '❌ No'}</p>
                                    {base64Data && (
                                        <div className="mt-2">
                                            <p>Preview (first 100 chars):</p>
                                            <code className="text-xs bg-gray-200 p-1 rounded block mt-1">
                                                {base64Data.substring(0, 100)}...
                                            </code>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {imageFile && (
                                <div>
                                    <h4 className="font-medium text-gray-900">Image Preview:</h4>
                                    <img
                                        src={URL.createObjectURL(imageFile)}
                                        alt="Receipt preview"
                                        className="max-w-full h-48 object-contain border rounded"
                                    />
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <h4 className="font-medium text-blue-900">Troubleshooting Tips:</h4>
                                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                                    <li>• Base64 length should be 50,000+ characters for typical receipts</li>
                                    <li>• Image type should be image/jpeg, image/png, etc.</li>
                                    <li>• File size should be 100KB - 5MB for good results</li>
                                    <li>• Check browser console for base64 conversion errors</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </MobileOptimizedLayout>
            );
        }
    }

    return (
        <MobileOptimizedLayout>
            <FeatureGate
                feature={FEATURE_GATES.RECEIPT_SCAN}
                fallback={
                    <div className="space-y-6">
                        {/* Feature gate fallback content (unchanged from original) */}
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

                            <div className="text-center">
                                <TouchEnhancedButton
                                    onClick={() => window.location.href = '/pricing?source=receipt-scanner'}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                                >
                                    Upgrade to Gold - Start Scanning!
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        <Footer/>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Header */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">📄 Receipt Scanner</h1>
                                <p className="text-gray-600">Scan your receipt to quickly add items to inventory</p>
                                {/* Platform info for development */}
                                {process.env.NODE_ENV === 'development' && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        {platformInfo.isAndroid ? '🤖 Android MLKit' :
                                            platformInfo.isIOSPWA ? '📱 iOS PWA - Tesseract.js' :
                                                '💻 Web - Tesseract.js'}
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
                                            <path fillRule="evenodd"
                                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                  clipRule="evenodd"/>
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-blue-800">
                                            📄 Receipt Scanning ({(() => {
                                            if (usageDisplay.isUnlimited || usageDisplay.tier === 'admin') {
                                                return `${usageDisplay.current}`;
                                            }
                                            return `${usageDisplay.current}/${usageDisplay.limit}`;
                                        })()}) - {platformInfo.isAndroid ? 'Android ML Kit' : 'Tesseract.js OCR'}
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
                                        <div className="text-6xl mb-4">
                                            {platformInfo.isAndroid ? '🤖' : platformInfo.isIOSPWA ? '📱' : '💻'}
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Capture Your Receipt
                                        </h3>
                                        <p className="text-gray-600 mb-6">
                                            {platformInfo.isAndroid
                                                ? 'Using Android ML Kit for native OCR processing'
                                                : platformInfo.isIOSPWA
                                                    ? 'Using optimized Tesseract.js OCR for iOS PWA'
                                                    : 'Using optimized Tesseract.js OCR for reliable text recognition'
                                            }
                                        </p>
                                    </div>

                                    {/* Three Universal Options */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {/* Camera Option - Available on all platforms */}
                                        <TouchEnhancedButton
                                            onClick={startCamera}
                                            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                        >
                                            <div className="text-4xl mb-2">📷</div>
                                            <div className="text-lg font-medium text-indigo-700">Take Photo</div>
                                            <div className="text-sm text-gray-500 text-center">
                                                {platformInfo.isAndroid ? 'Native camera + ML Kit' :
                                                    platformInfo.isIOSPWA ? 'iOS PWA camera' :
                                                        'Use device camera'}
                                            </div>
                                            {platformInfo.isIOSPWA && (
                                                <div className="text-xs text-yellow-600 mt-1">May need permissions</div>
                                            )}
                                        </TouchEnhancedButton>

                                        {/* Upload Image Option - Available on all platforms */}
                                        <TouchEnhancedButton
                                            onClick={handleUploadButtonClick}
                                            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                                        >
                                            <div className="text-4xl mb-2">📁</div>
                                            <div className="text-lg font-medium text-green-700">Upload Image</div>
                                            <div className="text-sm text-gray-500 text-center">
                                                Paper receipt photo
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">From gallery/files</div>
                                        </TouchEnhancedButton>

                                        {/* Email Receipt Option - Available on all platforms */}
                                        <TouchEnhancedButton
                                            onClick={handleEmailReceiptUpload}
                                            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
                                        >
                                            <div className="text-4xl mb-2">📧</div>
                                            <div className="text-lg font-medium text-purple-700">Email Receipt</div>
                                            <div className="text-sm text-gray-500 text-center">
                                                Copy-paste to TXT file
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">100% accurate</div>
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Universal file inputs */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleReceiptFileUpload}
                                        className="hidden"
                                    />
                                    {/* Simplified email receipt file input - TXT only */}
                                    <input
                                        ref={emailReceiptInputRef}
                                        type="file"
                                        accept="text/plain,.txt"
                                        onChange={handleEmailReceiptFileUpload}
                                        className="hidden"
                                    />

                                    {/* Platform-Specific Guidance */}
                                    {platformInfo.isAndroid && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <h4 className="text-sm font-medium text-green-900 mb-2">
                                                🤖 Android Native App
                                            </h4>
                                            <p className="text-sm text-green-800 mb-3">
                                                You're using Google's native ML Kit for optimal performance and
                                                accuracy.
                                                All three options work great on Android!
                                            </p>
                                            <ul className="text-sm text-green-700 space-y-1">
                                                <li>• <strong>Take Photo:</strong> Uses native camera with ML Kit OCR
                                                </li>
                                                <li>• <strong>Upload Image:</strong> Process any saved photo</li>
                                                <li>• <strong>Email Receipt:</strong> Screenshot email receipts for best
                                                    results
                                                </li>
                                            </ul>
                                        </div>
                                    )}

                                    {platformInfo.isIOSPWA && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <h4 className="text-sm font-medium text-blue-900 mb-2">
                                                📱 iOS PWA
                                            </h4>
                                            <p className="text-sm text-blue-800 mb-3">
                                                <strong>Tip:</strong> If camera doesn't work, "Upload Image" and "Email
                                                Receipt"
                                                work perfectly! Enhanced Tesseract.js provides reliable OCR.
                                            </p>
                                            <ul className="text-sm text-blue-700 space-y-1">
                                                <li>• <strong>Take Photo:</strong> May need camera permissions</li>
                                                <li>• <strong>Upload Image:</strong> Most reliable option for iOS</li>
                                                <li>• <strong>Email Receipt:</strong> Screenshot emails for perfect
                                                    accuracy
                                                </li>
                                            </ul>
                                        </div>
                                    )}

                                    {platformInfo.isWeb && !platformInfo.isIOSPWA && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                            <h4 className="text-sm font-medium text-purple-900 mb-2">
                                                💻 Web Browser
                                            </h4>
                                            <p className="text-sm text-purple-800 mb-3">
                                                You're using Tesseract.js, a reliable and proven OCR engine
                                                optimized for receipt scanning. All options work great!
                                            </p>
                                            <ul className="text-sm text-purple-700 space-y-1">
                                                <li>• <strong>Take Photo:</strong> Uses browser camera API</li>
                                                <li>• <strong>Upload Image:</strong> Drag & drop or browse files</li>
                                                <li>• <strong>Email Receipt:</strong> Screenshot or save HTML emails
                                                </li>
                                            </ul>
                                        </div>
                                    )}

                                    {/* Email Receipt Simple Instructions */}
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-green-900 mb-2">📧 Email Receipt
                                            Instructions:</h4>
                                        <div className="text-sm text-green-800">
                                            <div className="bg-white border border-green-200 rounded p-3 mb-3">
                                                <p className="font-medium text-green-900 mb-2">Simple 5-Step
                                                    Process:</p>
                                                <ol className="space-y-1 text-green-700">
                                                    <li><strong>1.</strong> Open your email receipt</li>
                                                    <li><strong>2.</strong> Select all text (Ctrl+A / Cmd+A)</li>
                                                    <li><strong>3.</strong> Copy (Ctrl+C / Cmd+C)</li>
                                                    <li><strong>4.</strong> Paste into Notepad/TextEdit and save as .txt
                                                    </li>
                                                    <li><strong>5.</strong> Upload the .txt file here</li>
                                                </ol>
                                            </div>

                                            <div className="space-y-2">
                                                <p><strong>✅ Works with ALL email providers:</strong></p>
                                                <div className="ml-4 text-green-700">
                                                    <p>• Gmail, Outlook, Yahoo, Apple Mail, etc.</p>
                                                    <p>• Perfect accuracy (no OCR errors)</p>
                                                    <p>• Gets all items, quantities, and prices</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 p-2 bg-green-100 rounded">
                                                <p className="font-medium text-green-800">🎯 Why this works: Pure text =
                                                    100% accurate parsing!</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Universal Tips */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">📝 Tips for Best
                                            Results:</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                                            <div>
                                                <strong>📷 Paper Receipts:</strong>
                                                <ul className="mt-1 space-y-1">
                                                    <li>• Ensure receipt is flat and well-lit</li>
                                                    <li>• Avoid shadows and glare</li>
                                                    <li>• Include entire receipt in frame</li>
                                                </ul>
                                            </div>
                                            <div>
                                                <strong>📁 Image Upload:</strong>
                                                <ul className="mt-1 space-y-1">
                                                    <li>• Use high resolution images</li>
                                                    <li>• Clear, focused photos work best</li>
                                                    <li>• Good lighting is essential</li>
                                                </ul>
                                            </div>
                                            <div>
                                                <strong>📧 Email Receipts:</strong>
                                                <ul className="mt-1 space-y-1">
                                                    <li>• Screenshot the full email</li>
                                                    <li>• Or save email as HTML file</li>
                                                    <li>• Most accurate option available</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Report Issue Section - Keep your existing one */}
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-yellow-900 mb-2">🐛 Having Issues?</h4>
                                        <p className="text-sm text-yellow-800 mb-3">
                                            If the receipt scanner isn't working properly with your receipt, you can
                                            report the issue to help us improve it.
                                        </p>
                                        <TouchEnhancedButton
                                            onClick={openReportModal}
                                            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                                        >
                                            📧 Report Receipt Issue
                                        </TouchEnhancedButton>
                                    </div>
                                    {/* 🆕 ADD THIS DEBUG SECTION HERE */}
                                    {process.env.NODE_ENV === 'development' && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                                            <h4 className="text-sm font-medium text-yellow-900 mb-2">🔧 Development Debug
                                                Tools</h4>
                                            <TouchEnhancedButton
                                                onClick={() => setShowDebugModal(true)}
                                                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                                            >
                                                🔍 Debug Last Upload
                                            </TouchEnhancedButton>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Camera View (Web only) */}
                            {showCamera && !platformInfo.isNative && (
                                <div ref={cameraContainerRef} className="space-y-4">
                                    <div className="text-center">
                                        <h3 className="text-lg font-medium mb-4">📷 Camera View</h3>
                                        {platformInfo.isIOSPWA && (
                                            <p className="text-sm text-yellow-600 mb-2">
                                                iOS PWA detected - using optimized camera settings
                                            </p>
                                        )}
                                    </div>

                                    <div className="relative bg-black rounded-lg overflow-hidden">
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
                                            <div
                                                className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                                💻 Tesseract.js OCR
                                            </div>
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
                                </div>
                            )}

                            {/* Step 2: Processing - Enhanced for AI */}
                            {step === 'processing' && (
                                <div className="text-center space-y-6">
                                    <div className="text-6xl mb-4">
                                        {platformInfo.isAndroid ? '🤖' : '🔍'}
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Processing Receipt with {platformInfo.isAndroid ? 'ML Kit' : 'Tesseract.js'} + AI Enhancement
                                    </h3>
                                    <p className="text-gray-600 mb-6">{processingStatus}</p>

                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                        <div
                                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                            style={{width: `${ocrProgress}%`}}
                                        ></div>
                                    </div>

                                    {/* AI Processing Indicator */}
                                    {processingStatus.includes('AI') && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mx-auto max-w-md">
                                            <div className="flex items-center justify-center space-x-2 mb-2">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                                <span className="text-blue-800 font-medium">🤖 AI Enhancement Active</span>
                                            </div>
                                            <p className="text-sm text-blue-700">
                                                Advanced AI is analyzing your receipt to improve accuracy and extract detailed product information.
                                                Large receipts may take up to 2 minutes.
                                            </p>
                                        </div>
                                    )}

                                    {capturedImage && (
                                        <div className="mt-4">
                                            <img
                                                src={capturedImage}
                                                alt="Captured receipt"
                                                className="max-w-xs mx-auto rounded-lg shadow-md"
                                            />
                                        </div>
                                    )}

                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                </div>
                            )}

                            {/* Step 3: Review Items */}
                            {step === 'review' && (
                                <div className="space-y-6">
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">Review AI-Enhanced
                                                Items</h3>
                                            <p className="text-gray-600">
                                                {extractedItems.filter(item => item.selected).length} of {extractedItems.length} items
                                                selected
                                                {' '}- Enhanced with AI analysis
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
                                            <div className="text-center py-8 text-gray-500">
                                                No items were extracted from the receipt. Please try again with a
                                                clearer image.
                                            </div>
                                        ) : (
                                            extractedItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={`border rounded-lg p-6 ${item.selected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}
                                                >
                                                    <div className="flex items-start space-x-4">
                                                        {/* Checkbox */}
                                                        <input
                                                            type="checkbox"
                                                            checked={item.selected}
                                                            onChange={() => toggleItemSelection(item.id)}
                                                            className="mt-2 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        />

                                                        {/* Main Content */}
                                                        <div className="flex-1 space-y-4">
                                                            {/* AI Enhancement Status */}
                                                            {item.aiEnhanced && (
                                                                <div
                                                                    className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center space-x-2">
                                                                            <span
                                                                                className="text-green-600 font-medium">🤖 AI Enhanced</span>
                                                                            <span className="text-sm text-green-700">
                                                    Confidence: {Math.round((item.confidence || 0.85) * 100)}%
                                                </span>
                                                                            {item.needsReview && (
                                                                                <span
                                                                                    className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                                        Review Recommended
                                                    </span>
                                                                            )}
                                                                        </div>
                                                                        <span
                                                                            className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                                {item.enhancementSource || 'AI'}
                                            </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Price Tracking Banner */}
                                                            {item.hasReceiptPriceData && (
                                                                <div
                                                                    className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center space-x-2">
                                                                            <span
                                                                                className="text-green-600 font-medium">💰 Price Data Available</span>
                                                                            <span className="text-sm text-green-700">
                                                    ${item.receiptPriceEntry.price} at {item.receiptPriceEntry.store}
                                                </span>
                                                                        </div>
                                                                        <span
                                                                            className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                                Auto-tracked
                                            </span>
                                                                    </div>
                                                                    {item.receiptPriceEntry.size && (
                                                                        <div className="text-xs text-green-600 mt-1">
                                                                            Size: {item.receiptPriceEntry.size}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Form Fields - Fixed Layout */}
                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                                {/* Left Column */}
                                                                <div className="space-y-4">
                                                                    {/* Item Name */}
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
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Category
                                                                        </label>
                                                                        <select
                                                                            value={item.category}
                                                                            onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                                        >
                                                                            <option value="">Select category</option>
                                                                            <option value="Baking & Cooking Ingredients">Baking & Cooking Ingredients</option>
                                                                            <option value="Beans">Beans</option>
                                                                            <option value="Beverages">Beverages</option>
                                                                            <option value="Bouillon">Bouillon</option>
                                                                            <option value="Boxed Meals">Boxed Meals</option>
                                                                            <option value="Breads">Breads</option>
                                                                            <option value="Canned/Jarred Beans">Canned/Jarred Beans</option>
                                                                            <option value="Canned/Jarred Fruit">Canned/Jarred Fruit</option>
                                                                            <option value="Canned/Jarred Meals">Canned/Jarred Meals</option>
                                                                            <option value="Canned/Jarred Meat">Canned/Jarred Meat</option>
                                                                            <option value="Canned/Jarred Sauces">Canned/Jarred Sauces</option>
                                                                            <option value="Canned/Jarred Tomatoes">Canned/Jarred Tomatoes</option>
                                                                            <option value="Canned/Jarred Vegetables">Canned/Jarred Vegetables</option>
                                                                            <option value="Cheese">Cheese</option>
                                                                            <option value="Condiments">Condiments</option>
                                                                            <option value="Dairy">Dairy</option>
                                                                            <option value="Eggs">Eggs</option>
                                                                            <option value="Fresh Fruits">Fresh Fruits</option>
                                                                            <option value="Fresh Spices">Fresh Spices</option>
                                                                            <option value="Fresh Vegetables">Fresh Vegetables</option>
                                                                            <option value="Fresh/Frozen Beef">Fresh/Frozen Beef</option>
                                                                            <option value="Fresh/Frozen Fish & Seafood">Fresh/Frozen Fish & Seafood</option>
                                                                            <option value="Fresh/Frozen Lamb">Fresh/Frozen Lamb</option>
                                                                            <option value="Fresh/Frozen Pork">Fresh/Frozen Pork</option>
                                                                            <option value="Fresh/Frozen Poultry">Fresh/Frozen Poultry</option>
                                                                            <option value="Fresh/Frozen Rabbit">Fresh/Frozen Rabbit</option>
                                                                            <option value="Fresh/Frozen Venison">Fresh/Frozen Venison</option>
                                                                            <option value="Frozen Fruit">Frozen Fruit</option>
                                                                            <option value="Frozen Meals">Frozen Meals</option>
                                                                            <option value="Frozen Other Items">Frozen Other Items</option>
                                                                            <option value="Frozen Vegetables">Frozen Vegetables</option>
                                                                            <option value="Grains">Grains</option>
                                                                            <option value="Other">Other</option>
                                                                            <option value="Pasta">Pasta</option>
                                                                            <option value="Seasonings">Seasonings</option>
                                                                            <option value="Snacks">Snacks</option>
                                                                            <option value="Soups & Soup Mixes">Soups & Soup Mixes</option>
                                                                            <option value="Spices">Spices</option>
                                                                            <option value="Stock/Broth">Stock/Broth</option>
                                                                            <option value="Stuffing & Sides">Stuffing & Sides</option>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Right Column */}
                                                                <div className="space-y-4">
                                                                    {/* Quantity and Location */}
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                                Quantity
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                min="1"
                                                                                step="1"
                                                                                value={item.quantity || ''}
                                                                                onChange={(e) => {
                                                                                    const newQuantity = parseInt(e.target.value) || 1;
                                                                                    updateItem(item.id, 'quantity', newQuantity);
                                                                                    // Auto-update unit price when quantity changes
                                                                                    updateItem(item.id, 'unitPrice', (item.price || 0) / newQuantity);
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    // Select all text when focused for easier editing
                                                                                    e.target.select();
                                                                                }}
                                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                                                placeholder="1"
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
                                                                                <option value="kitchen">Kitchen
                                                                                    Cabinets
                                                                                </option>
                                                                                <option value="fridge">Fridge</option>
                                                                                <option value="fridge-freezer">Fridge
                                                                                    Freezer
                                                                                </option>
                                                                                <option
                                                                                    value="deep-freezer">Deep/Stand-up
                                                                                    Freezer
                                                                                </option>
                                                                                <option value="garage">Garage/Storage
                                                                                </option>
                                                                                <option value="other">Other</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>

                                                                    {/* Price and UPC Display - FIXED: Make price editable */}
                                                                    <div className="grid grid-cols-3 gap-3">
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                                Total Price
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                min="0"
                                                                                value={item.price || ''}
                                                                                onChange={(e) => {
                                                                                    const newPrice = parseFloat(e.target.value) || 0;
                                                                                    updateItem(item.id, 'price', newPrice);
                                                                                    updateItem(item.id, 'unitPrice', newPrice / (item.quantity || 1));
                                                                                }}
                                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                                                placeholder="0.00"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                                Unit Price
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                min="0"
                                                                                value={item.unitPrice || ''}
                                                                                onChange={(e) => {
                                                                                    const newUnitPrice = parseFloat(e.target.value) || 0;
                                                                                    updateItem(item.id, 'unitPrice', newUnitPrice);
                                                                                    updateItem(item.id, 'price', newUnitPrice * (item.quantity || 1));
                                                                                }}
                                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                                                placeholder="0.00"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                                UPC Code
                                                                            </label>
                                                                            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                                                                                {item.upc || 'Not detected'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* UPC Lookup Button */}
                                                        {item.upc && (
                                                            <div className="flex-shrink-0">
                                                                <TouchEnhancedButton
                                                                    onClick={() => lookupByUPC(item)}
                                                                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                                                    title={`Lookup product details for UPC: ${item.upc}`}
                                                                >
                                                                    🔍 Lookup
                                                                </TouchEnhancedButton>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Item Metadata */}
                                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                                        <div
                                                            className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                                            <span
                                                                className="font-medium">Price: ${item.price ? item.price.toFixed(2) : '0.00'}</span>
                                                            {item.unitPrice && item.unitPrice !== item.price && (
                                                                <span>Unit Price: ${item.unitPrice.toFixed(2)}</span>
                                                            )}
                                                            {item.upc && <span>UPC: {item.upc}</span>}
                                                            {item.taxCode && <span>Tax: {item.taxCode}</span>}
                                                            {item.aiEnhanced && (
                                                                <span className="text-green-600 font-medium">✅ AI Verified</span>
                                                            )}
                                                            {item.hasReceiptPriceData && (
                                                                <span className="text-green-600 font-medium">💰 Price Tracked</span>
                                                            )}
                                                        </div>
                                                        <div
                                                            className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded">
                                                            Raw OCR: {item.rawText}
                                                        </div>
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
                                    <h3 className="text-lg font-medium text-gray-900">Adding Items to
                                        Inventory</h3>
                                    <p className="text-gray-600 mb-6">{processingStatus}</p>
                                    <div
                                        className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                </div>
                            )}
                        </div>
                    </div>


                    {/* Hidden canvas for photo capture */}
                    <canvas ref={canvasRef} className="hidden"/>

                    {/* iOS PWA Camera Modal */}
                    <IOSPWACameraModal/>

                    {/* Report Issue Modal */}
                    {showReportModal && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div
                                className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">📧 Report
                                            Receipt Issue</h3>
                                        <TouchEnhancedButton
                                            onClick={() => setShowReportModal(false)}
                                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                        >
                                            ×
                                        </TouchEnhancedButton>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label
                                                className="block text-sm font-medium text-gray-700 mb-1">
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
                                                <option value="android-mlkit-not-working">Android ML Kit
                                                    Not Working
                                                </option>
                                                <option value="tesseractjs-poor-accuracy">Tesseract.js
                                                    Poor Accuracy
                                                </option>
                                                <option value="ios-pwa-camera-not-working">iOS PWA
                                                    Camera Not Working
                                                </option>
                                                <option value="camera-not-working">Camera not working
                                                </option>
                                                <option value="wrong-items-detected">Wrong items
                                                    detected
                                                </option>
                                                <option value="missing-items">Items not detected
                                                </option>
                                                <option value="categories-wrong">Wrong categories
                                                    assigned
                                                </option>
                                                <option value="upc-lookup-failed">UPC lookup not
                                                    working
                                                </option>
                                                <option value="app-crash">App crashed/froze</option>
                                                <option value="other">Other issue</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label
                                                className="block text-sm font-medium text-gray-700 mb-1">
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
                                            <label
                                                className="block text-sm font-medium text-gray-700 mb-1">
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
                                                <label
                                                    className="block text-sm font-medium text-gray-700 mb-2">
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
                                            <label
                                                className="block text-sm font-medium text-gray-700 mb-2">
                                                Additional Screenshots/Images
                                            </label>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleReportFileUpload}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                            <p className="text-xs text-gray-500">
                                                Upload screenshots showing the issue. Supports: JPG,
                                                PNG, GIF, WebP (max
                                                10MB each)
                                            </p>

                                            {reportData.additionalFiles.length > 0 && (
                                                <div className="space-y-2 mt-2">
                                                    <p className="text-sm font-medium text-gray-700">
                                                        Files to be sent
                                                        ({reportData.additionalFiles.length}):
                                                    </p>
                                                    {reportData.additionalFiles.map((file, index) => (
                                                        <div key={index}
                                                             className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                            <div
                                                                className="flex items-center space-x-2">
                                                                <span className="text-sm">📸</span>
                                                                <span
                                                                    className="text-sm text-gray-700 truncate">{file.name}</span>
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

                                        <div
                                            className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-sm text-blue-800">
                                                📝 <strong>Your report will include:</strong>
                                            </p>
                                            <ul className="text-sm text-blue-700 mt-1 space-y-1">
                                                <li>• Your issue description</li>
                                                <li>•
                                                    Platform: {platformInfo.isAndroid ? 'Android (ML Kit)' :
                                                        platformInfo.isIOSPWA ? 'iOS PWA (Tesseract.js)' : 'Web (Tesseract.js)'}</li>
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

                    {/* 🆕 ADD THIS DEBUG MODAL CALL HERE */}
                    <DebugModal
                        isOpen={showDebugModal}
                        onClose={() => setShowDebugModal(false)}
                        imageFile={debugImageFile}
                        base64Data={debugBase64Data}
                    />

                    <Footer/>
                </div>


            </FeatureGate>
        </MobileOptimizedLayout>
    );
}