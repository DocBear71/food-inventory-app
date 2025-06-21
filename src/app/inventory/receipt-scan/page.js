'use client';
// file: /src/app/inventory/receipt-scan/page.js - v9 current working file


import {useState, useRef, useEffect} from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import {useRouter} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '@/lib/api-config';

export default function ReceiptScan() {
    // const {data: session, status} = useSafeSession();
    const router = useRouter();
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // State management - ALL HOOKS FIRST (Fixed order)
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

    let session = null;
    let status = 'loading';

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
        status = sessionResult?.status || 'loading';
    } catch (error) {
        // Mobile build fallback
        session = null;
        status = 'unauthenticated';
    }

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

        const safariUrl = window.location.href;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-md w-full p-6">
                    <div className="text-center">
                        <div className="text-4xl mb-4">📱</div>
                        <h3 className="text-lg font-bold text-blue-600 mb-2">
                            iOS PWA Camera Workaround
                        </h3>
                        <p className="text-gray-600 mb-4">
                            iOS has strict camera limitations in PWA mode. Let's use the next best option!
                        </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-green-900 mb-2">
                            📸 Recommended: Use Your Camera App
                        </h4>
                        <div className="text-sm text-green-800 space-y-2">
                            <p><strong>Step 1:</strong> Take a photo of your receipt with your iPhone camera</p>
                            <p><strong>Step 2:</strong> Come back here and tap "Upload Receipt Image"</p>
                            <p><strong>Step 3:</strong> Select the photo you just took</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <TouchEnhancedButton
                            onClick={() => {
                                setShowIOSPWAModal(false);
                                // Trigger file input immediately
                                setTimeout(() => {
                                    fileInputRef.current?.click();
                                }, 100);
                            }}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-lg font-medium"
                        >
                            <span>📁</span>
                            <span>Upload Receipt Image</span>
                        </TouchEnhancedButton>

                        <div className="text-center text-sm text-gray-500 my-2">or</div>

                        <TouchEnhancedButton
                            onClick={() => {
                                // Open current page in Safari
                                window.open(safariUrl, '_blank');
                            }}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <span>🌐</span>
                            <span>Open in Safari Browser</span>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => {
                                setShowIOSPWAModal(false);
                                // Try camera again with minimal constraints
                                startCameraMinimal();
                            }}
                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            🔄 Try Minimal Camera Mode
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => setShowIOSPWAModal(false)}
                            className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                            Cancel
                        </TouchEnhancedButton>
                    </div>

                    <div className="mt-4 text-center text-xs text-gray-500">
                        iOS PWA Camera Limitations
                        • {deviceInfo.userAgent.includes('iPhone') ? 'iPhone' : 'iOS'} {deviceInfo.userAgent.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || ''}
                    </div>
                </div>
            </div>
        );
    }

    // Minimal camera attempt function (last resort)
    async function startCameraMinimal() {
        console.log('🔄 Trying minimal camera mode for iOS PWA...');
        setCameraError(null);

        try {
            // Use the optimized camera with minimal constraints
            const minimalDeviceInfo = {
                ...deviceInfo,
                isMobile: true // Force mobile constraints for minimal mode
            };

            const stream = await initializeOptimizedCamera(minimalDeviceInfo);

            if (stream && stream.getVideoTracks().length > 0) {
                console.log('✅ Minimal camera mode worked!');
                streamRef.current = stream;
                setShowCamera(true);

                // Basic video setup
                await setupOptimizedVideo(videoRef.current, stream, minimalDeviceInfo);
            } else {
                throw new Error('No video tracks in minimal stream');
            }
        } catch (error) {
            console.log('❌ Even minimal camera mode failed:', error);
            setCameraError('Camera not available in iOS PWA mode. Please use the upload option.');

            // Auto-trigger upload as fallback
            setTimeout(() => {
                fileInputRef.current?.click();
            }, 1000);
        }
    }

    // Enhanced camera start function with iOS PWA fixes based on research
    async function startCamera() {
        setCameraError(null);

        try {
            // Use the optimized camera initialization
            const stream = await initializeOptimizedCamera(deviceInfo);
            streamRef.current = stream;

            // Use the optimized video setup
            await setupOptimizedVideo(videoRef.current, stream, deviceInfo);

            setShowCamera(true);
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

    // Simple camera stop function
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

    // Enhanced photo capture with better quality and processing
    function capturePhoto() {
        if (!videoRef.current || !canvasRef.current || !streamRef.current) {
            alert('Camera not ready');
            return;
        }

        try {
            // Use the optimized image capture
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

    // Enhanced OCR processing with better settings
    async function processImage(imageFile) {
        setIsProcessing(true);
        setStep('processing');
        setOcrProgress(0);
        setProcessingStatus('Initializing OCR...');

        try {
            // Use the optimized OCR processing
            const text = await processImageWithOptimizedOCR(
                imageFile,
                deviceInfo,
                (progress) => {
                    setOcrProgress(progress);
                    setProcessingStatus(`Extracting text... ${progress}%`);
                }
            );

            setProcessingStatus('Analyzing receipt...');

            // Keep your existing parsing logic
            const items = parseReceiptText(text);
            setExtractedItems(items);
            setProcessingStatus('Complete!');
            setStep('review');

        } catch (error) {
            console.error('OCR processing error:', error);
            alert('Error processing receipt. Please try again with a clearer image.');
            setStep('upload');
        } finally {
            setIsProcessing(false);
            setOcrProgress(0);
        }
    }

    // OPTIMIZED Camera Access and OCR Configuration for Receipt Scanner

// ============ OPTIMIZED CAMERA CONSTRAINTS ============
    function getOptimizedCameraConstraints(deviceInfo) {
        // Standard high-quality constraints for receipt scanning
        const standardConstraints = {
            video: {
                facingMode: { ideal: "environment" }, // Prefer rear camera
                width: { ideal: 1920, min: 1280, max: 3840 },
                height: { ideal: 1080, min: 720, max: 2160 },
                aspectRatio: { ideal: 16/9 },
                // Advanced camera features for better image quality
                focusMode: { ideal: "continuous" },
                exposureMode: { ideal: "continuous" },
                whiteBalanceMode: { ideal: "continuous" },
                torch: false // No flash for receipts
            },
            audio: false // Never need audio for receipt scanning
        };

        // iOS PWA optimized constraints
        const iosPWAConstraints = [
            // Best case: High quality with environment camera
            {
                video: {
                    facingMode: { exact: "environment" },
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 }
                },
                audio: false
            },
            // Fallback: Any environment camera
            {
                video: {
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            },
            // Last resort: Any camera
            {
                video: {
                    width: { ideal: 640, min: 480 },
                    height: { ideal: 480, min: 360 }
                },
                audio: false
            }
        ];

        // Mobile optimized constraints (Android/iOS browser)
        const mobileConstraints = {
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                frameRate: { ideal: 30, max: 30 } // Limit framerate for performance
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

// ============ OPTIMIZED CAMERA INITIALIZATION ============
    async function initializeOptimizedCamera(deviceInfo) {
        console.log('🎥 Initializing optimized camera for receipt scanning...');

        // Check for camera support
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera API not supported on this device');
        }

        // Get available devices first for better constraint selection
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

        // Try each constraint set
        for (let i = 0; i < constraintSets.length; i++) {
            const constraints = constraintSets[i];
            console.log(`📷 Attempting camera with constraints ${i + 1}/${constraintSets.length}`);

            try {
                // Add timeout for mobile devices
                const timeout = deviceInfo.isMobile ? 10000 : 5000;
                const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Camera timeout')), timeout)
                );

                stream = await Promise.race([streamPromise, timeoutPromise]);

                if (stream?.getVideoTracks().length > 0) {
                    console.log('✅ Camera stream obtained successfully');

                    // Log actual settings for debugging
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

// ============ OPTIMIZED VIDEO ELEMENT SETUP ============
    async function setupOptimizedVideo(videoElement, stream, deviceInfo) {
        console.log('🎬 Setting up optimized video element...');

        // iOS specific attributes
        if (deviceInfo.isIOS) {
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('webkit-playsinline', 'true');
            videoElement.muted = true;
            videoElement.autoplay = true;
            videoElement.controls = false;
        }

        // Optimize video element styles for receipt scanning
        videoElement.style.objectFit = 'cover';
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';

        videoElement.srcObject = stream;

        // Wait for video to be ready
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

                // Check if video has dimensions despite timeout
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

            // Force play for iOS
            if (deviceInfo.isIOS) {
                videoElement.play().catch(e => console.log('Video autoplay prevented:', e));
            }
        });
    }

// ============ OPTIMIZED IMAGE CAPTURE ============
    function captureOptimizedImage(videoElement, canvasElement) {
        console.log('📸 Capturing optimized image for OCR...');

        // Add null checks
        if (!videoElement || !canvasElement) {
            throw new Error('Video or canvas element is null');
        }

        const video = videoElement;
        const canvas = canvasElement;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        // Use actual video dimensions for maximum quality
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width === 0 || height === 0) {
            throw new Error('Video not ready for capture - no dimensions');
        }

        console.log(`📹 Capturing at ${width}x${height}`);

        // Set canvas to video resolution
        canvas.width = width;
        canvas.height = height;

        // Optimize canvas for OCR
        ctx.imageSmoothingEnabled = false; // Preserve sharp edges
        ctx.imageSmoothingQuality = 'high';

        // Draw video frame
        ctx.drawImage(video, 0, 0, width, height);

        // Apply OCR-optimized image processing
        try {
            const imageData = ctx.getImageData(0, 0, width, height);
            const processedImageData = optimizeImageForOCR(imageData);
            ctx.putImageData(processedImageData, 0, 0);
        } catch (error) {
            console.warn('⚠️ Image processing failed, using original image:', error);
            // Continue without image enhancement if it fails
        }

        // Return high-quality blob
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create image blob'));
                }
            }, 'image/jpeg', 0.98); // Very high quality
        });
    }

// ============ OPTIMIZED IMAGE PROCESSING FOR OCR ============
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

        // Apply contrast enhancement and noise reduction
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Convert to grayscale for better OCR
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // Apply contrast enhancement
            const contrast = 1.3;
            const brightness = 15;
            const enhanced = Math.min(255, Math.max(0,
                contrast * (gray - 128) + 128 + brightness
            ));

            // Apply basic sharpening (simplified to avoid errors)
            const sharp = Math.min(10, Math.max(-10, enhanced * 0.1));

            const finalValue = Math.min(255, Math.max(0, enhanced + sharp));

            data[i] = finalValue;     // R
            data[i + 1] = finalValue; // G
            data[i + 2] = finalValue; // B
            // Alpha unchanged
        }

        return imageData;
    }

    function applySharpening(data, index, width, height) {
        // Simple sharpening kernel
        const kernelSize = 3;
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        // Apply kernel (simplified for performance)
        return Math.min(15, Math.max(-15,
            (data[index] * kernel[4]) -
            (data[index - 4] || 0) -
            (data[index + 4] || 0)
        ));
    }

// ============ OPTIMIZED OCR CONFIGURATION ============
    // FIXED: Optimized OCR Configuration - Removed problematic logger
    function getOptimizedOCRConfig(deviceInfo) {
        console.log('⚙️ Configuring optimized OCR settings...');

        // Base configuration optimized for receipts
        const baseConfig = {
            // REMOVED: logger function that causes DataCloneError
            // Optimized for receipt text
            tessedit_pageseg_mode: '6', // Single uniform block of text
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$/()@-: ',
            preserve_interword_spaces: '1',
            tessedit_do_invert: '0', // Don't auto-invert
            tessedit_create_hocr: '0', // Disable HOCR for performance
            tessedit_create_pdf: '0', // Disable PDF for performance
            tessedit_create_txt: '1', // Only create text output
        };

        // Mobile-specific optimizations
        if (deviceInfo.isMobile) {
            return {
                ...baseConfig,
                user_defined_dpi: '200', // Lower DPI for mobile performance
                tessedit_parallelize: '0', // Disable parallelization on mobile
            };
        }

        // Desktop optimizations
        return {
            ...baseConfig,
            user_defined_dpi: '300', // Higher DPI for better accuracy
            tessedit_parallelize: '1', // Enable parallelization
        };
    }


// ============ OPTIMIZED OCR PROCESSING ============
    // FIXED: Optimized OCR Processing - Separate logger handling
    async function processImageWithOptimizedOCR(imageBlob, deviceInfo, progressCallback) {
        console.log('🔍 Starting optimized OCR processing...');

        try {
            // Dynamic import for better loading performance
            const Tesseract = (await import('tesseract.js')).default;

            // Create worker with separate logger
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text' && progressCallback) {
                        const progress = Math.round(m.progress * 100);
                        console.log(`OCR Progress: ${progress}%`);
                        progressCallback(progress);
                    }
                }
            });

            // Configure OCR with optimized settings (without logger)
            const ocrConfig = getOptimizedOCRConfig(deviceInfo);

            // Process the image
            console.log('📄 Recognizing text...');
            const { data: { text, confidence } } = await worker.recognize(imageBlob, ocrConfig);

            console.log(`✅ OCR completed with ${confidence}% confidence`);
            console.log(`📝 Extracted text length: ${text.length} characters`);

            // Cleanup
            await worker.terminate();

            return text;

        } catch (error) {
            console.error('❌ OCR processing failed:', error);
            throw error;
        }
    }

// ============ OPTIMIZED USAGE EXAMPLE ============
    async function startOptimizedReceiptScan(videoElement, canvasElement, deviceInfo) {
        try {
            // 1. Initialize optimized camera
            const stream = await initializeOptimizedCamera(deviceInfo);

            // 2. Setup optimized video
            await setupOptimizedVideo(videoElement, stream, deviceInfo);

            return stream;

        } catch (error) {
            console.error('❌ Optimized camera setup failed:', error);
            throw error;
        }
    }

    async function captureAndProcessReceipt(videoElement, canvasElement, deviceInfo, progressCallback) {
        try {
            // 1. Capture optimized image
            const imageBlob = await captureOptimizedImage(videoElement, canvasElement);

            // 2. Process with optimized OCR
            const text = await processImageWithOptimizedOCR(imageBlob, deviceInfo, progressCallback);

            return { imageBlob, text };

        } catch (error) {
            console.error('❌ Optimized capture and OCR failed:', error);
            throw error;
        }
    }

// ============ PERFORMANCE MONITORING ============
    class ReceiptScannerPerformanceMonitor {
        constructor() {
            this.metrics = {};
        }

        startTimer(operation) {
            this.metrics[operation] = { start: performance.now() };
        }

        endTimer(operation) {
            if (this.metrics[operation]) {
                this.metrics[operation].duration = performance.now() - this.metrics[operation].start;
                console.log(`⏱️ ${operation}: ${this.metrics[operation].duration.toFixed(2)}ms`);
            }
        }

        getMetrics() {
            return this.metrics;
        }
    }

    // Handle receipt file upload
    function handleReceiptFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            setCapturedImage(imageUrl);
            processImage(file);
        } else {
            alert('Please select a valid image file.');
        }
    }

    // FIXED parseReceiptText function - restored proper Walmart/Sam's Club support
    function parseReceiptText(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const items = [];

        // Common patterns for receipt items
        const pricePattern = /\$?(\d+\.\d{2})/;
        const upcPattern = /\b\d{12,14}\b/;

        // Skip patterns - but we'll apply these to CLEANED names, not raw lines
        const skipPatterns = [
            // ============ STORE NAMES AND HEADERS ============
            /^(walmart|target|kroger|publix|safeway|hy-vee|hyvee|sam's club|sams club|costco)$/i,
            /^(trader joe's|trader joes|smith's|smiths)$/i,
            /^(total|subtotal|tax|change|card|cash)$/i,
            /^(thank you|receipt|store|phone|address)$/i,

            // ============ PAYMENT AND TRANSACTION LINES ============
            /^(debit|credit|card|cash|tend|tender)$/i,
            /^(payment|transaction|approval)$/i,
            /^(visa|mastercard|amex|discover)$/i,

            // ============ RECEIPT FOOTER INFORMATION ============
            /^(change due|amount due|balance)$/i,
            /^(customer|member|rewards)$/i,
            /^(save|saved|you saved)$/i,
            /^(coupon|discount|promotion)$/i,

            // ============ COMMON ABBREVIATIONS AND CODES ============
            /^(nf|t|f|n)$/i,  // Tax codes only
            /^(ea|each)$/i,   // Unit indicators only

            // Keep other specific patterns but apply them to cleaned names
        ];

        // Patterns to skip on RAW lines (before cleaning) - only obvious non-product lines
        const rawLineSkipPatterns = [
            /^\d{2}\/\d{2}\/\d{4}/,  // Dates
            /^\(\s*\d{3}\s*\)\s*\d{3}\s*-?\s*\d{4}/,  // Phone numbers
            /^[\d\s\-\(\)]+$/,  // Number-only lines
            /^\d{4}\s+\d{2}\/\d{2}\/\d{2}/,  // Store + date
            /^manager\s+/i,
            /^st#\s*\d+/i,
            /^op#\s*\d+/i,
            /walmart\.com/i,
            /^balance\s+\$/i,
            /^change\s+\$/i,
            /^approval\s+#/i,
            /^auth\s+code/i,
            /voided\s*bankcard/i,
            /transaction\s*(not\s*)?complete/i,
            /^terminal\s*#/i,
            /^[\d\s]{15,}$/,  // Very long number sequences only
        ];

        console.log(`📄 Processing ${lines.length} lines from receipt...`);

        // Process lines with NEW logic: extract info first, then check skip patterns
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
            const prevLine = i > 0 ? lines[i - 1] : '';

            // STEP 1: Skip obvious non-product lines based on RAW line format
            let shouldSkipRaw = false;
            for (const pattern of rawLineSkipPatterns) {
                if (pattern.test(line)) {
                    console.log(`📋 Skipping raw line pattern: ${line}`);
                    shouldSkipRaw = true;
                    break;
                }
            }
            if (shouldSkipRaw) continue;

            // STEP 2: Check if line contains a price (indicates it might be a product)
            const priceMatch = line.match(pricePattern);
            if (!priceMatch) {
                console.log(`📋 Skipping line without price: ${line}`);
                continue;
            }

            const price = parseFloat(priceMatch[1]);

            // Skip extreme prices
            if (price > 200) {
                console.log(`📋 Skipping high price line (likely total): ${line}`);
                continue;
            }

            // STEP 3: Extract and clean the product name FIRST
            let nameMatch = line;
            let itemPrice = price;
            let quantity = 1;
            let unitPrice = price;

            // Handle different store formats for name extraction
            // Sam's Club format: [E] UPC PRODUCT_NAME PRICE TAX_CODE
            const samsParts = line.match(/^([E]?\s*\d+)\s+(.+?)\s+(\d+\.\d{2})\s*([TNF]?)$/i);
            if (samsParts) {
                nameMatch = samsParts[2].trim();
                itemPrice = parseFloat(samsParts[3]);
                console.log(`📋 Sam's Club format: "${nameMatch}" - $${itemPrice}`);
            } else {
                // For other formats, remove price and UPC codes
                nameMatch = line.replace(pricePattern, '').trim();
                nameMatch = nameMatch.replace(/^\d{8,}\s+/, ''); // Remove leading UPC
            }

            // STEP 4: Clean the product name
            nameMatch = cleanItemName(nameMatch);
            nameMatch = cleanSamsClubItemName(nameMatch);

            // STEP 5: NOW check skip patterns on the CLEANED name
            let shouldSkipName = false;
            for (const pattern of skipPatterns) {
                if (pattern.test(nameMatch)) {
                    console.log(`📋 Skipping cleaned name pattern: "${nameMatch}" from "${line}"`);
                    shouldSkipName = true;
                    break;
                }
            }
            if (shouldSkipName) continue;

            // STEP 6: Additional validation on cleaned name
            if (!nameMatch || nameMatch.length < 2) {
                console.log(`📋 Skipping short name: "${nameMatch}" from "${line}"`);
                continue;
            }

            if (nameMatch.match(/^\d+\.?\d*$/)) {
                console.log(`📋 Skipping number-only name: "${nameMatch}" from "${line}"`);
                continue;
            }

            // Skip negative amounts (discounts)
            if (line.match(/\d+\.\d{2}[-\s]*[nt]$/i)) {
                console.log(`📋 Skipping discount line: ${line}`);
                continue;
            }

            // STEP 7: We have a valid product! Create the item
            console.log(`📋 ✅ Processing item: ${nameMatch} - Qty: ${quantity} @ ${unitPrice} = ${itemPrice}`);

            // Extract UPC from original line
            const upcMatch = line.match(upcPattern);

            const item = {
                id: Date.now() + Math.random(),
                name: nameMatch,
                price: itemPrice,
                quantity: quantity,
                unitPrice: unitPrice,
                upc: upcMatch ? upcMatch[0] : '',
                category: guessCategory(nameMatch),
                location: guessLocation(nameMatch),
                rawText: line,
                selected: true,
                needsReview: false
            };

            items.push(item);
        }

        console.log(`📋 Extracted ${items.length} items from receipt`);
        return combineDuplicateItems(items);
    }

    // Enhanced name cleaning specifically for Sam's Club products
    function cleanSamsClubItemName(name) {
        // Handle Sam's Club specific product name patterns
        if (name.match(/bath\s+tissue/i)) {
            return "Bath Tissue";
        } else if (name.match(/klnx\s+12pk/i)) {
            return "Kleenex 12-Pack";
        } else if (name.match(/\$50gplay/i)) {
            return "$50 Google Play Card";
        } else if (name.match(/\$25gplay/i)) {
            return "$25 Google Play Card";
        } else if (name.match(/buffalosauc/i)) {
            return "Buffalo Sauce";
        } else if (name.match(/teriyaki/i)) {
            return "Teriyaki Sauce";
        } else if (name.match(/kndrhbsbbq/i)) {
            return "BBQ Sauce";
        } else if (name.match(/mm\s+minced\s+gf/i)) {
            return "Minced Garlic";
        } else if (name.match(/tones\s+italnf/i)) {
            return "Italian Seasoning";
        } else if (name.match(/mm\s+chives/i)) {
            return "Chives";
        } else if (name.match(/stckyhoney/i)) {
            return "Sticky Honey";
        } else if (name.match(/roasted\s+winf/i)) {
            return "Roasted Wine";
        } else if (name.match(/korbbqwingsf/i)) {
            return "Korean BBQ Wings";
        } else if (name.match(/mm\s+coq10/i)) {
            return "CoQ10 Supplement";
        } else if (name.match(/ns\s+shin\s+blaf/i)) {
            return "Shin Black Noodles";
        } else if (name.match(/picnic\s+packf/i)) {
            return "Picnic Pack";
        } else if (name.match(/fruit\s+tray/i)) {
            return "Fruit Tray";
        }

        return name;
    }

    // Combine duplicate items function
    function combineDuplicateItems(items) {
        const upcGroups = {};
        const nameGroups = {};

        // Group by UPC code first (most reliable)
        items.forEach(item => {
            if (item.upc && item.upc.length >= 11) {
                const cleanUPC = item.upc.replace(/\D/g, '');
                if (!upcGroups[cleanUPC]) {
                    upcGroups[cleanUPC] = [];
                }
                upcGroups[cleanUPC].push(item);
            } else {
                // Items without UPC codes - check for name matching
                const cleanName = item.name.toLowerCase().trim();
                if (!nameGroups[cleanName]) {
                    nameGroups[cleanName] = [];
                }
                nameGroups[cleanName].push(item);
            }
        });

        const combinedItems = [];

        // Process UPC groups
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

        // Process name groups (items without UPC)
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

    // Enhanced cleanItemName function with support for all stores
    function cleanItemName(name) {
        // Remove common store tax codes and artifacts
        name = name.replace(/\s+NF\s*$/i, ''); // Remove "NF" tax code (Target)
        name = name.replace(/\s+T\s*$/i, '');  // Remove "T" tax code (Target)
        name = name.replace(/\s+HOME\s*$/i, ''); // Remove "HOME" section indicator (Target)

        // Remove quantity patterns that might have been missed
        name = name.replace(/\s*\d+\s*@\s*\$?\d+\.\d{2}.*$/i, '');

        // Remove long product codes and discount info
        name = name.replace(/^\d{10,}/, '').trim(); // Remove long product codes
        name = name.replace(/\d+%:?/, '').trim(); // Remove percentage info
        name = name.replace(/\(\$\d+\.\d{2}\)/, '').trim(); // Remove discount amounts
        name = name.replace(/[-\s]*[nt]$/i, '').trim(); // Remove -N or -T suffixes
        name = name.replace(/\s*-\s*$/, '').trim(); // Remove trailing dash

        // Handle specific brand conversions for Target
        if (name.match(/birds?\s*eye/i)) {
            name = "Birds Eye";
        } else if (name.match(/frosty\s*paws/i)) {
            name = "Frosty Paws";
        } else if (name.match(/gg\s*vegetable/i)) {
            name = "Great Grains Vegetable";
        }

        // Clean up common OCR artifacts
        name = name.replace(/[^\w\s\-&']/g, ' '); // Remove special chars except common ones
        name = name.replace(/\s+/g, ' '); // Normalize whitespace
        name = name.trim();

        // Capitalize properly
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    // Enhanced guessCategory function with Sam's Club support while preserving ALL existing store logic
    function guessCategory(name) {
        const nameLower = name.toLowerCase();

        // Sam's Club specific categories
        if (nameLower.includes('bath tissue') || (nameLower.includes('tissue') && !nameLower.includes('facial'))) {
            return 'Personal Care';
        }
        if (nameLower.includes('kleenex') || nameLower.includes('klnx')) {
            return 'Personal Care';
        }
        if (nameLower.includes('google play') || nameLower.includes('gplay')) {
            return 'Gift Cards';
        }
        if ((nameLower.includes('buffalo') || nameLower.includes('teriyaki') || nameLower.includes('bbq')) && nameLower.includes('sauce')) {
            return 'Condiments';
        }
        if (nameLower.includes('korean') && nameLower.includes('wings')) {
            return 'Frozen Meals';
        }
        if (nameLower.includes('coq10') || nameLower.includes('supplement')) {
            return 'Health & Wellness';
        }
        if (nameLower.includes('shin') && (nameLower.includes('noodles') || nameLower.includes('black'))) {
            return 'Asian Foods';
        }
        if (nameLower.includes('sticky') && nameLower.includes('honey')) {
            return 'Sweeteners';
        }

        // EXISTING LOGIC - All original category detection preserved
        if (nameLower.includes('milk') || nameLower.includes('yogurt') || nameLower.includes('yoghurt')) {
            return 'Dairy';
        }
        if (nameLower.includes('cheese') || nameLower.includes('cheddar') || nameLower.includes('mozzarella')) {
            return 'Cheese';
        }

        // Bread products
        if (nameLower.includes('bread') || nameLower.includes('bagel') || nameLower.includes('rolls') ||
            nameLower.includes('bun') || nameLower.includes('bak')) {
            return 'Breads';
        }

        // Fresh produce
        if (nameLower.includes('apple') || nameLower.includes('banana') || nameLower.includes('orange') ||
            nameLower.includes('lemon') || nameLower.includes('lime')) {
            return 'Fresh Fruits';
        }
        if (nameLower.includes('lettuce') || nameLower.includes('tomato') || nameLower.includes('carrot') ||
            nameLower.includes('onion') || nameLower.includes('shallot') || nameLower.includes('parsley')) {
            return 'Fresh Vegetables';
        }

        // Meat products
        if (nameLower.includes('chicken') || nameLower.includes('poultry')) {
            return 'Fresh/Frozen Poultry';
        }
        if (nameLower.includes('beef') || nameLower.includes('ground beef')) {
            return 'Fresh/Frozen Beef';
        }
        if (nameLower.includes('pork') || nameLower.includes('ham') || nameLower.includes('bacon')) {
            return 'Fresh/Frozen Pork';
        }
        if (nameLower.includes('turkey') || nameLower.includes('ground turkey')) {
            return 'Fresh/Frozen Poultry';
        }

        // Grains and cereals
        if (nameLower.includes('cereal') || nameLower.includes('oats') || nameLower.includes('rice')) {
            return 'Grains';
        }

        // Pasta
        if (nameLower.includes('pasta') || nameLower.includes('noodle') || nameLower.includes('spaghetti') ||
            nameLower.includes('veggiecraft')) {
            return 'Pasta';
        }

        // Beverages
        if (nameLower.includes('coffee') || nameLower.includes('brew') || nameLower.includes('drink') ||
            nameLower.includes('juice') || nameLower.includes('soda')) {
            return 'Beverages';
        }
        if (nameLower.includes('wine') && !nameLower.includes('roasted')) {
            return 'Beverages';
        }

        // Canned goods
        if (nameLower.includes('soup') || nameLower.includes('can') || nameLower.includes('sauce')) {
            return 'Canned Meals';
        }
        if (nameLower.includes('tomato') && (nameLower.includes('crushed') || nameLower.includes('csdt'))) {
            return 'Canned Tomatoes';
        }

        // Snacks
        if (nameLower.includes('cracker') || nameLower.includes('popcorn') || nameLower.includes('chip')) {
            return 'Snacks';
        }
        if (nameLower.includes('peanut') && nameLower.includes('butter') && nameLower.includes('cup')) {
            return 'Snacks';
        }
        if (nameLower.includes('picnic')) {
            return 'Snacks';
        }

        // Frozen items
        if (nameLower.includes('birds eye') || nameLower.includes('frozen vegetable')) {
            return 'Frozen Vegetables';
        }
        if (nameLower.includes('frosty paws') || nameLower.includes('ice cream') || nameLower.includes('frozen treat')) {
            return 'Frozen Fruit';
        }

        // Fresh fruits
        if (nameLower.includes('fruit tray') || nameLower.includes('fruit')) {
            return 'Fresh Fruits';
        }

        // Spices and seasonings
        if (nameLower.includes('garlic') || nameLower.includes('chives') ||
            nameLower.includes('italian') || nameLower.includes('seasoning')) {
            return 'Spices';
        }

        // Condiments (general)
        if (nameLower.includes('hummus')) {
            return 'Condiments';
        }

        return 'Other';
    }


    function guessLocation(name) {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('frozen') || nameLower.includes('ice cream') || nameLower.includes('frosty paws')) {
            return 'freezer';
        }
        if (nameLower.includes('milk') || nameLower.includes('yogurt') || nameLower.includes('cheese')) {
            return 'fridge';
        }
        // Kitchen cabinets for spices, seasonings, and cooking essentials
        if (nameLower.includes('spice') || nameLower.includes('seasoning') ||
            nameLower.includes('salt') || nameLower.includes('pepper') ||
            nameLower.includes('garlic powder') || nameLower.includes('onion powder') ||
            nameLower.includes('cumin') || nameLower.includes('paprika') ||
            nameLower.includes('oregano') || nameLower.includes('thyme') ||
            nameLower.includes('vanilla') || nameLower.includes('extract') ||
            nameLower.includes('baking soda') || nameLower.includes('baking powder') ||
            nameLower.includes('olive oil') || nameLower.includes('vegetable oil') ||
            nameLower.includes('vinegar') || nameLower.includes('soy sauce') ||
            nameLower.includes('hot sauce') || nameLower.includes('honey')) {
            return 'kitchen';
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
                sum += digit * 1; // Even positions (0,2,4,6,8,10) multiply by 1
            } else {
                sum += digit * 3; // Odd positions (1,3,5,7,9,11) multiply by 3
            }
        }

        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit;
    }

    async function lookupByUPC(item) {
        if (!item.upc) return;

        // Function to try UPC lookup with a specific code
        async function tryUPCLookup(upcCode) {
            const response = await fetch(getApiUrl(`/api/upc/lookup?upc=${upcCode}`));
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

            // Strategy 1: Try original UPC first
            upcVariations.push(originalUPC);

            // Strategy 2: If 12 digits, calculate the correct check digit
            if (originalUPC.length === 12) {
                const checkDigit = calculateUPCCheckDigit(originalUPC);
                if (checkDigit !== null) {
                    calculatedVariation = originalUPC + checkDigit;
                    upcVariations.push(calculatedVariation);
                }
            }

            // Strategy 3: If 11 digits, pad with zero and calculate check digit
            if (originalUPC.length === 11) {
                const paddedUPC = '0' + originalUPC;
                upcVariations.push(paddedUPC);

                const checkDigit = calculateUPCCheckDigit(paddedUPC);
                if (checkDigit !== null) {
                    calculatedVariation = paddedUPC + checkDigit;
                    upcVariations.push(calculatedVariation);
                }
            }

            // Strategy 4: If 13 digits, try removing last digit and recalculating
            if (originalUPC.length === 13) {
                const truncatedUPC = originalUPC.slice(0, -1);
                const checkDigit = calculateUPCCheckDigit(truncatedUPC);
                if (checkDigit !== null) {
                    calculatedVariation = truncatedUPC + checkDigit;
                    upcVariations.push(calculatedVariation);
                }
            }

            console.log(`Smart UPC lookup for ${originalUPC}. Calculated variation: ${calculatedVariation}`);

            // Try the smart variations first (original + calculated)
            for (const upcCode of upcVariations) {
                try {
                    const data = await tryUPCLookup(upcCode);

                    if (data && data.success && data.product && data.product.found) {
                        // Update item with product information
                        if (data.product.name && data.product.name !== 'Unknown Product') {
                            updateItem(item.id, 'name', data.product.name);
                        }

                        if (data.product.category && data.product.category !== 'Other') {
                            updateItem(item.id, 'category', data.product.category);
                        }

                        if (data.product.brand) {
                            updateItem(item.id, 'brand', data.product.brand);
                        }

                        // Update the UPC with the working version
                        updateItem(item.id, 'upc', upcCode);
                        updateItem(item.id, 'needsReview', false);

                        // Show success message
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
                        return; // Success, exit function
                    }
                } catch (error) {
                    console.log(`UPC ${upcCode} failed:`, error.message);
                    continue;
                }
            }

            // Strategy 5: Only if smart calculation fails, try brute force (with user confirmation)
            const shouldTryAll = confirm(`❓ Smart UPC lookup failed for ${originalUPC}.\n\nTry checking all possible check digits? This will make multiple API calls.`);

            if (shouldTryAll && originalUPC.length === 12) {
                console.log('User approved brute force UPC search');

                // Try all possible check digits 0-9 (excluding calculated one already tried)
                for (let i = 0; i <= 9; i++) {
                    const testUPC = originalUPC + i;

                    // Skip if we already tried this one
                    if (calculatedVariation && testUPC === calculatedVariation) {
                        continue;
                    }

                    try {
                        const data = await tryUPCLookup(testUPC);

                        if (data && data.success && data.product && data.product.found) {
                            // Update item with product information
                            if (data.product.name && data.product.name !== 'Unknown Product') {
                                updateItem(item.id, 'name', data.product.name);
                            }

                            if (data.product.category && data.product.category !== 'Other') {
                                updateItem(item.id, 'category', data.product.category);
                            }

                            if (data.product.brand) {
                                updateItem(item.id, 'brand', data.product.brand);
                            }

                            updateItem(item.id, 'upc', testUPC);
                            updateItem(item.id, 'needsReview', false);

                            let successMessage = `✅ Product found: ${data.product.name}`;
                            if (data.product.brand) {
                                successMessage += ` (${data.product.brand})`;
                            }
                            successMessage += `\nCorrected UPC: ${originalUPC} → ${testUPC}`;
                            successMessage += `\n(Found via brute force search)`;

                            alert(successMessage);
                            return;
                        }
                    } catch (error) {
                        continue;
                    }
                }
            }

// If we get here, nothing worked
            const attemptedCount = shouldTryAll ? 'all variations' : `${upcVariations.length} smart variations`;
            alert(`❌ Product not found for UPC ${originalUPC} (tried ${attemptedCount})`);

        } catch (error) {
            console.error('UPC lookup error:', error);
            alert('❌ Network error during UPC lookup. Please check your connection and try again.');
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
        // Stop camera first
        stopCamera();

        // Reset all state
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

        // Clear file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <MobileOptimizedLayout>
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Camera Option - Always enabled, with iOS PWA detection info */}
                                    <TouchEnhancedButton
                                        onClick={startCamera}
                                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                    >
                                        <div className="text-4xl mb-2">📷</div>
                                        <div className="text-lg font-medium text-indigo-700">
                                            Take Photo
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {deviceInfo.isIOSPWA ? 'iOS PWA - Will try aggressive fixes' : 'Use device camera'}
                                        </div>
                                    </TouchEnhancedButton>

                                    {/* Upload Option */}
                                    <TouchEnhancedButton
                                        onClick={() => fileInputRef.current?.click()}
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
                                    onChange={handleReceiptFileUpload}
                                    className="hidden"
                                />

                                {/* iOS PWA specific guidance - Reframed positively */}
                                {deviceInfo.isIOSPWA && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-blue-900 mb-2">
                                            📱 iOS PWA Camera Tips
                                        </h4>
                                        <p className="text-sm text-blue-800 mb-3">
                                            <strong>Quick tip:</strong> If the camera doesn't work immediately, the
                                            "Upload Image" option
                                            works perfectly! Just take a photo with your iPhone camera first, then
                                            upload it here.
                                        </p>
                                        <div className="text-xs text-blue-700">
                                            Both methods provide identical OCR processing and results.
                                        </div>
                                    </div>
                                )}

                                {/* Error display */}
                                {cameraError && !deviceInfo.isIOSPWA && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="text-red-700">❌ {cameraError}</div>
                                        <div className="text-sm text-red-600 mt-2">
                                            Please try using the upload option instead, or check your camera
                                            permissions.
                                        </div>
                                    </div>
                                )}

                                {/* Tips */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-blue-900 mb-2">📝 Tips for Best Results:</h4>
                                    <ul className="text-sm text-blue-800 space-y-1">
                                        <li>• Ensure receipt is flat and well-lit</li>
                                        <li>• Avoid shadows and glare</li>
                                        <li>• Include the entire receipt in the frame</li>
                                        <li>• Higher resolution images work better</li>
                                        {deviceInfo.isIOS && <li>• iOS PWA may take longer to initialize camera</li>}
                                    </ul>
                                </div>

                                {/* Report Issue Section */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-yellow-900 mb-2">🐛 Having Issues?</h4>
                                    <p className="text-sm text-yellow-800 mb-3">
                                        If the receipt scanner isn't working properly with your receipt, you can report
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

                        {/* Camera View - Enhanced with iOS detection */}
                        {showCamera && (
                            <div className="space-y-4">
                                <div className="text-center">
                                    <h3 className="text-lg font-medium mb-4">📷 Camera View</h3>
                                    {deviceInfo.isIOS && (
                                        <p className="text-sm text-yellow-600 mb-2">
                                            iOS device detected - using optimized camera settings
                                        </p>
                                    )}
                                </div>

                                <div className="relative bg-black rounded-lg overflow-hidden">
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
                                    <div className="text-xs text-center bg-gray-100 p-2 rounded text-gray-600">
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
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
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
                                        <div className="text-center py-8 text-gray-500">
                                            No items were extracted from the receipt. Please try again with a
                                            clearer image.
                                        </div>
                                    ) : (
                                        extractedItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`border rounded-lg p-4 ${item.selected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    {/* Selection Checkbox */}
                                                    <input
                                                        type="checkbox"
                                                        checked={item.selected}
                                                        onChange={() => toggleItemSelection(item.id)}
                                                        className="mt-1 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                    />

                                                    {/* Item Details */}
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                                                <option value="Baking & Cooking Ingredients">Baking & Cooking Ingredients</option>
                                                                <option value="Beans">Beans</option>
                                                                <option value="Beverages">Beverages</option>
                                                                <option value="Bouillon">Bouillon</option>
                                                                <option value="Boxed Meals">Boxed Meals</option>
                                                                <option value="Breads">Breads</option>
                                                                <option value="Canned Beans">Canned/Jarred Beans</option>
                                                                <option value="Canned Fruit">Canned/Jarred Fruit</option>
                                                                <option value="Canned Meals">Canned/Jarred Meals</option>
                                                                <option value="Canned Meat">Canned/Jarred Meat</option>
                                                                <option value="Canned Sauces">Canned/Jarred Sauces</option>
                                                                <option value="Canned Tomatoes">Canned/Jarred Tomatoes</option>
                                                                <option value="Canned Vegetables">Canned/Jarred Vegetables</option>
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
                                                                    <option value="kitchen">Kitchen Cabinets</option>
                                                                    <option value="fridge">Fridge</option>
                                                                    <option value="freezer">Freezer</option>
                                                                    <option value="other">Other</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* UPC Lookup Button - Only show if UPC exists and API is available */
                                                    }
                                                    {
                                                        item.upc && (
                                                            <TouchEnhancedButton
                                                                onClick={() => lookupByUPC(item)}
                                                                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                                                title={`Lookup product details for UPC: ${item.upc}`}
                                                            >
                                                                🔍 Lookup
                                                            </TouchEnhancedButton>
                                                        )
                                                    }
                                                </div>

                                                {/* Additional Info */
                                                }
                                                <div className="mt-2 text-sm text-gray-500 flex items-center space-x-4">
                                                    <span>Price: ${item.price.toFixed(2)}</span>
                                                    {item.upc && <span>UPC: {item.upc}</span>}
                                                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                                        {item.rawText}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )
                                    }
                                </div>
                            </div>
                        )
                        }

                        {/* Step 4: Adding to Inventory */
                        }
                        {
                            step === 'adding' && (
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
                            )
                        }
                    </div>
                </div>

                {/* Hidden canvas for photo capture - Always rendered */
                }
                <canvas ref={canvasRef} className="hidden"/>

                {/* iOS PWA Camera Modal */
                }
                <IOSPWACameraModal/>

                {/* Report Issue Modal */
                }
                {
                    showReportModal && (
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
                                                <option value="camera-not-working">Camera not working
                                                </option>
                                                <option value="ocr-poor-accuracy">Poor text
                                                    recognition
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
                                            <div className="space-y-3">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={handleReportFileUpload}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                                <p className="text-xs text-gray-500">
                                                    Upload screenshots showing the issue. Supports: JPG,
                                                    PNG, GIF, WebP (max 10MB each)
                                                </p>

                                                {reportData.additionalFiles.length > 0 && (
                                                    <div className="space-y-2">
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
                                                                        className="text-sm text-gray-700 truncate">
                                                                    {file.name}
                                                                </span>
                                                                    <span
                                                                        className="text-xs text-gray-500">
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

                                        <div
                                            className="bg-blue-50 border border-blue-200 rounded-lg p-3">
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
        </MobileOptimizedLayout>
    );
}