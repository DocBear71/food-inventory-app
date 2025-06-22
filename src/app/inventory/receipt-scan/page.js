'use client';

// file: /src/app/inventory/receipt-scan/page.js - v12 Auto-scroll to camera + early usage gating

import {useState, useRef, useEffect} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import {useRouter} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {getApiUrl} from '@/lib/api-config';

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
    const [receiptScanUsage, setReceiptScanUsage] = useState(null);
    const [usageLoading, setUsageLoading] = useState(true);
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

    // Check usage limits on component mount and when needed
    useEffect(() => {
        if (session?.user?.id && status === 'authenticated') {
            checkReceiptScanUsage();
        }
    }, [session?.user?.id, status]);

    async function checkReceiptScanUsage() {
        try {
            setUsageLoading(true);
            const response = await fetch(getApiUrl('/api/receipt-scan/usage'));
            if (response.ok) {
                const data = await response.json();
                setReceiptScanUsage(data.usage);
                console.log('Receipt scan usage loaded:', data.usage);
            }
        } catch (error) {
            console.error('Failed to load receipt scan usage:', error);
        } finally {
            setUsageLoading(false);
        }
    }

    // NEW: Function to check usage limits before starting scan
    function checkUsageLimitsBeforeScan() {
        if (usageLoading) {
            alert('⏳ Please wait while we check your scan limits...');
            return false;
        }

        if (!receiptScanUsage) {
            alert('❌ Unable to check scan limits. Please refresh the page and try again.');
            return false;
        }

        if (!receiptScanUsage.canScan) {
            const limitMessage = receiptScanUsage.monthlyLimit === 'unlimited'
                ? 'Unexpected limit reached'
                : `You've reached your monthly limit of ${receiptScanUsage.monthlyLimit} receipt scans. Used: ${receiptScanUsage.currentMonth}/${receiptScanUsage.monthlyLimit}`;

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

        if (!usageLoading && receiptScanUsage && !receiptScanUsage.canScan) {
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
                                        You've used all {receiptScanUsage.monthlyLimit} of your receipt scans this
                                        month.
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
                    <IOSPWACameraModal/>
                </MobileOptimizedLayout>

            )
        }
    }


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

    // ENHANCED: OCR processing with reduced usage tracking since we check earlier
    async function processImage(imageFile) {
        setIsProcessing(true);
        setStep('processing');
        setOcrProgress(0);
        setProcessingStatus('Initializing OCR...');

        try {
            // Process the image with OCR (removed early usage check since we do it before starting)
            const text = await processImageWithOptimizedOCR(
                imageFile,
                deviceInfo,
                (progress) => {
                    setOcrProgress(progress);
                    setProcessingStatus(`Extracting text... ${progress}%`);
                }
            );

            setProcessingStatus('Analyzing receipt...');

            // Parse receipt text
            const items = parseReceiptText(text);

            if (items.length === 0) {
                // Even if no items found, this counts as a scan attempt
                setProcessingStatus('Recording scan attempt...');
                await recordReceiptScanUsage(0, 'no-items-found');

                alert('❌ No items could be extracted from this receipt. This scan has been counted towards your monthly limit. Please try with a clearer image.');
                setStep('upload');
                return;
            }

            // Record successful usage AFTER successful processing
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
                    // Continue anyway since the scan was successful
                } else {
                    const recordData = await recordResponse.json();
                    console.log('Receipt scan usage recorded:', recordData);

                    // Update local usage data
                    setReceiptScanUsage(recordData.usage);

                    // Update status with remaining scans
                    if (recordData.usage.remaining !== 'unlimited') {
                        setProcessingStatus(`Scan successful! ${recordData.usage.remaining} scans remaining this month.`);
                    }
                }
            } catch (recordError) {
                console.error('Error recording receipt scan usage:', recordError);
                // Continue anyway since the scan was successful
            }

            // Show results
            setExtractedItems(items);
            setProcessingStatus('Complete!');
            setStep('review');

        } catch (error) {
            console.error('OCR processing error:', error);

            // For processing errors, still count as a scan attempt
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

// Helper function to record receipt scan usage
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

    // OPTIMIZED Camera Access and OCR Configuration for Receipt Scanner

    // ============ OPTIMIZED CAMERA CONSTRAINTS ============
    function getOptimizedCameraConstraints(deviceInfo) {
        // Standard high-quality constraints for receipt scanning
        const standardConstraints = {
            video: {
                facingMode: {ideal: "environment"}, // Prefer rear camera
                width: {ideal: 1920, min: 1280, max: 3840},
                height: {ideal: 1080, min: 720, max: 2160},
                aspectRatio: {ideal: 16 / 9},
                // Advanced camera features for better image quality
                focusMode: {ideal: "continuous"},
                exposureMode: {ideal: "continuous"},
                whiteBalanceMode: {ideal: "continuous"},
                torch: false // No flash for receipts
            },
            audio: false // Never need audio for receipt scanning
        };

        // iOS PWA optimized constraints
        const iosPWAConstraints = [
            // Best case: High quality with environment camera
            {
                video: {
                    facingMode: {exact: "environment"},
                    width: {ideal: 1280, max: 1920},
                    height: {ideal: 720, max: 1080}
                },
                audio: false
            },
            // Fallback: Any environment camera
            {
                video: {
                    facingMode: "environment",
                    width: {ideal: 1280},
                    height: {ideal: 720}
                },
                audio: false
            },
            // Last resort: Any camera
            {
                video: {
                    width: {ideal: 640, min: 480},
                    height: {ideal: 480, min: 360}
                },
                audio: false
            }
        ];

        // Mobile optimized constraints (Android/iOS browser)
        const mobileConstraints = {
            video: {
                facingMode: {ideal: "environment"},
                width: {ideal: 1920, min: 1280},
                height: {ideal: 1080, min: 720},
                frameRate: {ideal: 30, max: 30} // Limit framerate for performance
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

        // FIXED: Add comprehensive null checks
        if (!videoElement) {
            throw new Error('Video element is null or undefined');
        }

        if (!stream) {
            throw new Error('Stream is null or undefined');
        }

        // iOS specific attributes
        if (deviceInfo.isIOS) {
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('webkit-playsinline', 'true');
            videoElement.muted = true;
            videoElement.autoplay = true;
            videoElement.controls = false;
        }

        // FIXED: Add null check before accessing style property
        if (videoElement.style) {
            // Optimize video element styles for receipt scanning
            videoElement.style.objectFit = 'cover';
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
        }

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

        // FIXED: Add comprehensive null checks
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
            const sharp = applySharpening(data, i, width, height);

            data[i] = enhanced + sharp;     // R
            data[i + 1] = enhanced + sharp; // G
            data[i + 2] = enhanced + sharp; // B
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
    async function processImageWithOptimizedOCR(imageBlob, deviceInfo,
                                                progressCallback) {
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
            const {data: {text, confidence}} = await worker.recognize(imageBlob, ocrConfig);

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

    // NEW: Handle upload button click with usage gating
    function handleUploadButtonClick() {
        // Check usage limits BEFORE opening file picker
        if (!checkUsageLimitsBeforeScan()) {
            return; // Don't open file picker if limits exceeded
        }

        // Only open file picker if usage check passes
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }

    // ENHANCED: Handle receipt file upload (now simplified since usage is checked before)
    function handleReceiptFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            setCapturedImage(imageUrl);
            processImage(file);
        } else {
            alert('Please select a valid image file.');
            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    // FIXED parseReceiptText function - Enhanced skip patterns and better
    function parseReceiptText(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const items = [];

        // Common patterns for receipt items
        const pricePattern = /\$?(\d+\.\d{2})/;
        const upcPattern = /\b\d{12,14}\b/;
        const quantityPattern = /(\d+)\s*@\s*\$?(\d+\.\d{2})/;

        // ENHANCED: Updated skip patterns with new problematic patterns
        const skipPatterns = [
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

            // Add more skip patterns as needed...
            /^\d+%?\s*(off|discount|save)$/i,
            /^\(\$\d+\.\d{2}\)$/i,
            /^-\$?\d+\.\d{2}$/i,
            /^\d+\.\d{2}-[nt]$/i,
            /^.*-\$?\d+\.\d{2}$/i,
        ];

        console.log(`📄 Processing ${lines.length} lines from receipt...`);

        // Process lines with enhanced context awareness
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
            const next2Line = i < lines.length - 2 ? lines[i + 2] : '';
            const prevLine = i > 0 ? lines[i - 1] : '';

            // Skip common header/footer patterns
            if (skipPatterns.some(pattern => pattern.test(line))) {
                console.log(`📋 Skipping pattern match: ${line}`);
                continue;
            }

            // Check if line contains a price
            const priceMatch = line.match(pricePattern);
            if (priceMatch) {
                const price = parseFloat(priceMatch[1]);

                // Skip very high prices that are likely totals (over $100)
                if (price > 100) {
                    console.log(`📋 Skipping high price line (likely total): ${line}`);
                    continue;
                }

                // Skip very low prices that are likely tax or fees (under $0.10)
                if (price < 0.10) {
                    console.log(`📋 Skipping very low price (likely fee): ${line}`);
                    continue;
                }

                let nameMatch = line;
                let itemPrice = price;
                let quantity = 1;
                let unitPrice = price;

                // Check for quantity continuation in next line (like "4 Ea 3")
                if (nextLine && nextLine.match(/^\d+\s+ea\s+\d+$/i)) {
                    const qtyMatch = nextLine.match(/(\d+)\s+ea\s+(\d+)/i);
                    if (qtyMatch) {
                        quantity = parseInt(qtyMatch[1]);
                        unitPrice = price / quantity;
                        itemPrice = price;
                        console.log(`📋 Found quantity info in next line (Ea pattern): ${quantity} ea, paid ${itemPrice}, unit price ${unitPrice.toFixed(2)}`);
                    }
                }

                // Remove price from name
                nameMatch = line.replace(pricePattern, '').trim();

                // Clean up the item name
                nameMatch = cleanItemName(nameMatch);

                // Only process if we have a meaningful item name
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

                    // Skip the next line if it was a quantity continuation line
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

    // Enhanced cleanItemName function
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

        // Clean up common OCR artifacts
        name = name.replace(/[^\w\s\-&']/g, ' '); // Remove special chars except common ones
        name = name.replace(/\s+/g, ' '); // Normalize whitespace
        name = name.trim();

        // Capitalize properly
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    // Enhanced guessCategory function
    function guessCategory(name) {
        const nameLower = name.toLowerCase();

        // Basic category guessing logic
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
                            <h1 className="text-2xl font-bold text-gray-900">📄
                                Receipt Scanner</h1>
                            <p className="text-gray-600">Scan your receipt to
                                quickly add items to inventory</p>
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
                                        Take a photo or upload an image of your
                                        shopping receipt
                                    </p>
                                </div>

                                {/* Usage display - show remaining scans */}
                                {receiptScanUsage && receiptScanUsage.remaining !== 'unlimited' && (
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
                                                    <strong>📊 {receiptScanUsage.remaining} receipt scans remaining
                                                        this month</strong>
                                                </p>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    Used: {receiptScanUsage.currentMonth}/{receiptScanUsage.monthlyLimit}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Camera Option - Always enabled, with iOS PWA detection info */}
                                    <TouchEnhancedButton
                                        onClick={startCamera}
                                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                    >
                                        <div className="text-4xl mb-2">📷</div>
                                        <div
                                            className="text-lg font-medium text-indigo-700">
                                            Take Photo
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {deviceInfo.isIOSPWA ? 'iOS PWA - Will try aggressive fixes' : 'Use device camera'}
                                        </div>
                                    </TouchEnhancedButton>

                                    {/* Upload Option */}
                                    <TouchEnhancedButton
                                        onClick={handleUploadButtonClick}
                                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                                    >
                                        <div className="text-4xl mb-2">📁</div>
                                        <div
                                            className="text-lg font-medium text-green-700">Upload
                                            Image
                                        </div>
                                        <div
                                            className="text-sm text-gray-500">Select
                                            from gallery
                                        </div>
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
                                                                    <option value="kitchen">Kitchen Cabinets</option>
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
                                                <div className="mt-2 text-sm text-gray-500 flex items-center space-x-4">
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
                                            onChange={(e) => setReportData(prev => ({...prev, issue: e.target.value}))}
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
                                            onChange={(e) => setReportData(prev => ({...prev, email: e.target.value}))}
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
                                                Upload screenshots showing the issue. Supports: JPG, PNG, GIF, WebP (max
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
        </MobileOptimizedLayout>
    )
}