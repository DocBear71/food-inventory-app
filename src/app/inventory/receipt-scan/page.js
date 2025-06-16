// file: /src/app/inventory/receipt-scan/page.js - v6 iOS PWA Camera Fixes for black screen issues

'use client';

import {useState, useRef, useEffect} from 'react';
import {useSession} from 'next-auth/react';
import {useRouter} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

export default function ReceiptScan() {
    const {data: session, status} = useSession();
    const router = useRouter();
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // State management - ALL HOOKS FIRST
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [capturedImage, setCapturedImage] = useState(null);
    const [extractedItems, setExtractedItems] = useState([]);
    const [showCamera, setShowCamera] = useState(false);
    const [step, setStep] = useState('upload'); // 'upload', 'processing', 'review', 'adding'
    const [processingStatus, setProcessingStatus] = useState('');
    const [cameraError, setCameraError] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isPWA, setIsPWA] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [reportData, setReportData] = useState({
        issue: '',
        description: '',
        email: '',
        receiptImage: null,
        additionalFiles: []
    });

    // Detect PWA mode and mobile device
    useEffect(() => {
        const checkEnvironment = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isSmallScreen = window.innerWidth <= 768;
            const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true ||
                document.referrer.includes('android-app://');

            setIsMobile(isMobileDevice || isSmallScreen);
            setIsPWA(isPWAMode);

            console.log('📱 Receipt Scanner Environment:', {
                isMobile: isMobileDevice || isSmallScreen,
                isPWA: isPWAMode,
                userAgent: navigator.userAgent,
                standalone: window.navigator.standalone,
                displayMode: window.matchMedia('(display-mode: standalone)').matches
            });
        };

        checkEnvironment();
        window.addEventListener('resize', checkEnvironment);
        window.addEventListener('orientationchange', checkEnvironment);

        return () => {
            window.removeEventListener('resize', checkEnvironment);
            window.removeEventListener('orientationchange', checkEnvironment);
        };
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

    // iOS PWA-specific camera initialization
    const initializeIOSPWACamera = async () => {
        console.log('📱 Starting iOS PWA camera for receipt scanning...');

        try {
            const iosPWAConstraints = {
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920, min: 1280, max: 1920 },
                    height: { ideal: 1080, min: 720, max: 1080 },
                    frameRate: { ideal: 30, min: 15, max: 60 },
                    aspectRatio: { ideal: 16/9 },
                    focusMode: "continuous",
                    exposureMode: "continuous",
                    whiteBalanceMode: "continuous"
                },
                audio: false
            };

            console.log('📱 iOS PWA Receipt Scanner: Requesting camera with constraints:', iosPWAConstraints);

            const stream = await navigator.mediaDevices.getUserMedia(iosPWAConstraints);

            console.log('✅ iOS PWA Receipt Scanner: Camera stream obtained:', {
                id: stream.id,
                active: stream.active,
                tracks: stream.getTracks().map(track => ({
                    kind: track.kind,
                    label: track.label,
                    enabled: track.enabled,
                    readyState: track.readyState,
                    settings: track.getSettings()
                }))
            });

            return stream;
        } catch (error) {
            console.error('❌ iOS PWA Receipt Scanner: Camera initialization failed:', error);
            throw error;
        }
    };

    // Enhanced camera start function with iOS PWA support
    async function startCamera() {
        setCameraError(null);

        try {
            console.log('🚀 Starting iOS PWA-optimized receipt camera...');

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported');
            }

            // Stop any existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            // iOS PWA-specific camera handling
            let stream;
            if (isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                console.log('📱 Using iOS PWA camera initialization...');
                stream = await initializeIOSPWACamera();
            } else {
                // Enhanced camera constraints for better OCR quality
                const constraints = {
                    video: {
                        facingMode: "environment",
                        width: {ideal: 1920, min: 1280},
                        height: {ideal: 1080, min: 720},
                        aspectRatio: {ideal: 16 / 9},
                        focusMode: 'continuous',
                        exposureMode: 'continuous',
                        whiteBalanceMode: 'continuous',
                        advanced: [
                            {focusMode: 'continuous'},
                            {exposureMode: 'continuous'},
                            {whiteBalanceMode: 'continuous'}
                        ]
                    }
                };

                // Try enhanced constraints first, fall back to basic if needed
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch (enhancedError) {
                    console.log('Enhanced constraints failed, trying basic constraints:', enhancedError);
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: "environment",
                            width: {ideal: 1280},
                            height: {ideal: 720}
                        }
                    });
                }
            }

            streamRef.current = stream;

            // Show camera first to ensure video element is rendered
            setShowCamera(true);

            // AUTO-SCROLL TO CAMERA VIEW
            // Wait a brief moment for the camera view to render, then scroll to it
            setTimeout(() => {
                // Find the camera container and scroll to it smoothly
                const cameraContainer = document.querySelector('[data-camera-container]');
                if (cameraContainer) {
                    cameraContainer.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                        inline: 'nearest'
                    });
                    console.log('📱 Auto-scrolled to camera view');
                } else {
                    // Fallback: scroll to the video element if camera container not found
                    setTimeout(() => {
                        if (videoRef.current) {
                            videoRef.current.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                                inline: 'nearest'
                            });
                            console.log('📱 Auto-scrolled to video element');
                        }
                    }, 200);
                }
            }, 300); // Small delay to ensure rendering

            // iOS PWA: Longer wait for video element
            const waitTime = isPWA ? 500 : 100;
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // Wait for video element with retries
            let retries = 0;
            const maxRetries = isPWA ? 20 : 10;
            while (!videoRef.current && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, isPWA ? 200 : 100));
                retries++;
            }

            if (!videoRef.current) {
                setCameraError('Video element not found after waiting');
                return;
            }

            // iOS PWA-specific video setup
            const video = videoRef.current;

            // iOS PWA: Set required attributes before setting srcObject
            if (isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
                video.muted = true;
                video.autoplay = true;

                console.log('📱 iOS PWA: Set video attributes for receipt scanning');
            }

            // Set video source
            video.srcObject = stream;

            // Wait for video to load with iOS PWA optimizations
            await new Promise((resolve, reject) => {
                const onLoadedMetadata = () => {
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    console.log(`📹 Receipt Scanner Camera resolution: ${video.videoWidth}x${video.videoHeight}`);
                    resolve();
                };

                const onError = (e) => {
                    video.removeEventListener('error', onError);
                    reject(e);
                };

                video.addEventListener('loadedmetadata', onLoadedMetadata);
                video.addEventListener('error', onError);

                // iOS PWA: Force play with better error handling
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('📱 iOS PWA Receipt Scanner: Video play successful');
                        })
                        .catch((playError) => {
                            console.log('📱 iOS PWA Receipt Scanner: Video play failed, retrying...', playError);
                            // Retry play after a short delay
                            setTimeout(() => {
                                video.play().catch(e => console.log('📱 iOS PWA Receipt Scanner: Video retry failed:', e));
                            }, 100);
                        });
                }
            });

        } catch (error) {
            console.error('❌ iOS PWA Receipt Scanner: Camera start failed:', error);

            let errorMessage = 'Failed to start camera: ' + error.message;
            if (isPWA && error.name === 'NotAllowedError') {
                errorMessage = 'iOS PWA camera permission denied. Camera permissions are reset each session in iOS PWAs. Please allow camera access.';
            }

            setCameraError(errorMessage);
        }
    }

    // Simple camera stop function with iOS PWA cleanup
    function stopCamera() {
        console.log('🛑 Stopping iOS PWA receipt camera...');

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log(`🛑 Stopped ${track.kind} track: ${track.label}`);
            });
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
            if (isPWA) {
                // iOS PWA: Force video element cleanup
                videoRef.current.load();
            }
        }

        setShowCamera(false);
        setCameraError(null);
        console.log('✅ iOS PWA receipt camera stopped');
    }

    // Enhanced photo capture with iOS PWA optimizations
    function capturePhoto() {
        if (!videoRef.current || !canvasRef.current || !streamRef.current) {
            alert('Camera not ready');
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Use full video resolution for better OCR
        const width = video.videoWidth;
        const height = video.videoHeight;

        console.log(`📷 iOS PWA: Capturing receipt at resolution: ${width}x${height}`);

        // Set canvas size to match video (high resolution)
        canvas.width = width;
        canvas.height = height;

        // Enhanced canvas drawing with better quality settings for iOS PWA
        context.imageSmoothingEnabled = false;
        context.textRenderingOptimization = 'optimizeLegibility';

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, width, height);

        // iOS PWA: Apply image enhancements for better OCR
        const imageData = context.getImageData(0, 0, width, height);
        const enhancedImageData = enhanceImageForOCR(imageData);
        context.putImageData(enhancedImageData, 0, 0);

        // Convert to blob with high quality settings
        canvas.toBlob((blob) => {
            if (blob) {
                console.log(`📷 iOS PWA: Captured receipt image size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

                const imageUrl = URL.createObjectURL(blob);
                setCapturedImage(imageUrl);
                stopCamera();
                processImage(blob);
            }
        }, 'image/jpeg', 0.95);
    }

    // Image enhancement function for better OCR (unchanged)
    function enhanceImageForOCR(imageData) {
        const data = imageData.data;
        const length = data.length;

        const contrast = 1.2;
        const brightness = 10;

        for (let i = 0; i < length; i += 4) {
            data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness));
            data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness));
            data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness));
        }

        return imageData;
    }

    // Enhanced OCR processing with iOS PWA considerations
    async function processImage(imageFile) {
        setIsProcessing(true);
        setStep('processing');
        setOcrProgress(0);
        setProcessingStatus('Initializing OCR...');

        try {
            setProcessingStatus('Loading OCR engine...');
            const Tesseract = (await import('tesseract.js')).default;

            setProcessingStatus('Processing image...');

            // iOS PWA-optimized OCR options
            const ocrOptions = {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        setOcrProgress(progress);
                        setProcessingStatus(`Extracting text... ${progress}%`);
                    }
                },
                tessedit_pageseg_mode: '6',
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$/()@-: ',
                preserve_interword_spaces: '1',
                user_defined_dpi: isPWA ? '200' : '300' // Slightly lower DPI for iOS PWA performance
            };

            const {data: {text}} = await Tesseract.recognize(
                imageFile,
                'eng',
                ocrOptions
            );

            setProcessingStatus('Analyzing receipt...');

            const items = parseReceiptText(text);

            console.log('📄 iOS PWA OCR Text:', text);
            console.log('📋 iOS PWA Parsed Items:', items);

            setExtractedItems(items);
            setProcessingStatus('Complete!');
            setStep('review');

        } catch (error) {
            console.error('❌ iOS PWA OCR processing error:', error);
            const errorMsg = isPWA ?
                'iOS PWA receipt processing failed. Please try again with a clearer image.' :
                'Error processing receipt. Please try again with a clearer image.';
            alert(errorMsg);
            setStep('upload');
        } finally {
            setIsProcessing(false);
            setOcrProgress(0);
        }
    }

    // Handle receipt file upload (renamed to avoid conflict)
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

    // Parse receipt text into structured items (keeping existing logic)
    function parseReceiptText(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const items = [];

        // Common patterns for receipt items
        const pricePattern = /\$?(\d+\.\d{2})/;
        const upcPattern = /\b\d{12,14}\b/;
        const quantityPattern = /(\d+)\s*@\s*\$?(\d+\.\d{2})/;

        // COMPREHENSIVE skip patterns - enhanced with Trader Joe's and Smith's
        const skipPatterns = [
            // ============ STORE NAMES AND HEADERS ============
            /^(walmart|target|kroger|publix|safeway|hy-vee|hyvee|sam's club|sams club|costco)/i,
            /^(trader joe's|trader joes|smith's|smiths)/i,
            /^(total|subtotal|tax|change|card|cash)/i,
            /^(thank you|receipt|store|phone|address)/i,
            /^\d{2}\/\d{2}\/\d{4}/,
            /^[\d\s\-\(\)]+$/,

            // ============ PAYMENT AND TRANSACTION LINES ============
            /^(debit|credit|card|cash|tend|tender)/i,
            /^(debit tend|credit tend|cash tend)/i,
            /^(payment|transaction|approval)/i,
            /^(ref|reference|auth|authorization)/i,
            /^(visa|mastercard|amex|discover|american express)/i,
            /^(visa credit|visa debit|mastercard credit)/i,

            // TRADER JOE'S SPECIFIC PAYMENT PATTERNS
            /^visa\s*$/i,
            /^payment\s+card\s+purchase\s+transaction/i,
            /^customer\s+copy/i,
            /^type:\s+contactless/i,
            /^aid:\s*\*+\d+/i,
            /^tid:\s*\*+\d+/i,
            /^no\s+cardholder\s+verification/i,
            /^please\s+retain\s+for\s+your\s+records/i,
            /^total\s+purchase/i,
            /^\*+\d{4}$/i, // Card number fragments

            // SMITH'S (KROGER) SPECIFIC PAYMENT PATTERNS
            /^your\s+cashier\s+was/i,
            /^fresh\s+value\s+customer/i,
            /^\*+\s*balance/i,
            /^\d{3}-\d{3}-\d{4}/i, // Phone numbers

            // ============ RECEIPT FOOTER INFORMATION ============
            /^(change due|amount due|balance)/i,
            /^(customer|member|rewards)/i,
            /^(save|saved|you saved)/i,
            /^(coupon|discount|promotion)/i,
            /^items\s+in\s+transaction/i,
            /^balance\s+to\s+pay/i,

            // ============ STORE OPERATION CODES AND IDS ============
            /^(st#|store|op|operator|te|terminal)/i,
            /^(tc#|transaction|seq|sequence)/i,
            /^[\d\s]{10,}$/,

            // ============ ITEMS SOLD COUNTER ============
            /^#?\s*items?\s+sold/i,
            /^\d+\s+items?\s+sold/i,

            // ============ BARCODE NUMBERS (STANDALONE) ============
            /^[\d\s]{15,}$/,

            // ============ HY-VEE SPECIFIC PATTERNS ============
            /^(sub-total|subtotal|sub total)/i,
            /^(net amount|netamount|net)/i,
            /^subtotal\s*\[\d+\]/i,
            /btl\s+dep/i,
            /btl\.\s+dep/i,
            /bottle\s+deposit/i,
            /deposit/i,
            /^\.?\d+\s*fs?\s*btl\s*dep/i,
            /^[;]*\s*[xi]\s+\d+\.\d+\s*@\s*\d+\.\d+%\s*=\s*\d+\.\d+$/i,
            /^[ti]\s+\d+\.\d+\s*@\s*\d+\.\d+%\s*=\s*\d+\.\d+$/i,

            // Variations with punctuation and OCR artifacts
            /^[;:]*\s*[xti]\s+\d+\.\d+\s*@/i,
            /^[xti]\s+\d+\.\d+\s*@\s*\d+\.\d+%/i,
            /^\d+\.\d+\s*@\s*\d+\.\d+%\s*=\s*\d+\.\d+$/i,

            // Also add these additional OCR artifact patterns:
            /^manual\s*weight/i,
            /^\d+\.\d+\s*lb\s*@\s*\d+\s*\d+\s*usd\/lb/i,

            // Tax reference fragments (OCR splitting)
            /^x\s+\d+\s+\d+\s+\d+$/i,
            /^[tx]\s+\d+(\s+\d+)*$/i,

            // Subtotal/total fragments (OCR number splitting)
            /^\d+\s+\d+\s+\d+\s+\d+$/i,
            /^\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}$/i,

            // Receipt formatting artifacts
            /^[\d\s]+\d{2}$/i,
            /^[a-z]\s+[\d\s]+$/i,

            // Mathematical operation fragments
            /^@\s*\d+\.\d+%/i,
            /^=\s*[\d\s]+$/i,
            /^\d+\.\d+%\s*=?$/i,

            // OCR misreads of common receipt elements
            /^sub\s*total\s*[\[\d\]]*$/i,
            /^total\s*[\[\d\]]*$/i,

            // Additional Hy-Vee specific OCR issues
            /employee\s*owned/i,
            /storeman/i,
            /group.*hy.*vee/i,

            // Generic OCR line-splitting artifacts
            /^[\d\s]{3,}$/,
            /^[a-z]{1,2}\s+[\d\s]+$/i,

            // ============ SAM'S CLUB SPECIFIC PATTERNS ============
            /^v\s+inst\s+sv/i,
            /^e\s+v\s+inst\s+sv/i,
            /^v\s+inst\s+sv.*\d+\.\d{2}[-\s]*[nt]$/i,
            /inst\s+sv.*[-\s]*[nt]$/i,
            /instant\s+sav/i,
            /^\d+\.\d{2}[-\s]*[nt]$/i,
            /tenbe\s*due/i,
            /tender\s*due/i,
            /change\s*due/i,
            /amount\s*due/i,
            /balance\s*due/i,
            /voided\s*bankcard/i,
            /bank\s*card/i,
            /transaction\s*not\s*complete/i,
            /^es\s*\|?\s*~?tenbe/i,
            /^es\s*\|?\s*~?tender/i,
            /^es\s*\|?\s*~?change/i,
            /transaction\s*complete/i,
            /debit\s*tend/i,
            /cash\s*tend/i,
            /terminal\s*#/i,
            /^[\d\s]{8,}$/,
            /\d+\.\d{2}[-\s]*n$/i,
            /\d+\.\d{2}[-\s]*t$/i,

            // ============ TARGET SPECIFIC PATTERNS ============
            // Quantity-only lines (these are part of the previous item)
            /^\d+\s*@\s*\$?\d+\.\d{2}\s*ea$/i,
            /^\d+\s*@\s*\$?\d+\.\d{2}$/i,
            /^\d+\s*ea$/i,
            /^ea$/i,

            // Regular price lines (discount information)
            /^regular\s+price/i,
            /^reg\s+price/i,
            /^was\s+\$?\d+\.\d{2}/i,

            // Target tax calculation patterns
            /^t\s*=\s*ia\s+tax/i,
            /^[t]\s*-\s*ia\s+tax/i,
            /^\d+\.\d+\s*on\s*\$?\d+\.\d{2}/i,

            // Payment method lines
            /^\*?\d{4}\s+debit\s+total/i,
            /^aid[:;]\s*[a-z0-9]+/i,
            /^auth\s+code[:;]/i,
            /^us\s+debit/i,

            // Return policy text
            /when\s+you\s+return/i,
            /return\s+credit/i,
            /promotional\s+discount/i,
            /applied\s+to\s+the/i,

            // Target Circle and promotional text
            /saving\s+with\s+target/i,
            /target\s+circle/i,
            /got\s+easier/i,
            /open\s+the\s+target/i,
            /target\.com/i,
            /see\s+your\s+savings/i,
            /find\s+more\s+benefits/i,

            // Generic promotional patterns
            /\bapp\b.*\bvisit\b/i,
            /benefits/i,

            // Address and location info
            /cedar\s+rapids/i,
            /blairs\s+ferry/i,
            /iowa\s+\d{5}/i,
            /\d{3}-\d{3}-\d{4}/i,

            // Additional Target-specific footer patterns
            /^nf$/i,
            /^t$/i,

            // Standalone letters/codes that appear on separate lines
            /^[a-z]$/i,
            /^[nt]$/i,

            // Store section headers
            /^grocery$/i,
            /^home$/i,
            /^electronics$/i,
            /^clothing$/i,

            // ============ TRADER JOE'S SPECIFIC PATTERNS ============
            // Header and footer text
            /^trader\s+joe/i,
            /^neighborhood\s+grocery\s+store/i,
            /^your\s+neighborhood/i,

            // Quantity continuation lines (these are part of previous item)
            /^\d+\s*@\s*\$?\d+\.\d{2}$/i, // "2 @ $8.49"
            /^@\s*\$?\d+\.\d{2}$/i, // "@ $8.49"

            // Transaction summary lines
            /^items\s+in\s+transaction[:;]?\s*\d+/i, // "Items in Transaction:6"
            /^balance\s+to\s+pay/i, // "Balance to pay"

            // Receipt type indicators
            /^customer\s+copy/i,
            /^merchant\s+copy/i,

            // Payment card info
            /^type[:;]\s*(contactless|chip|swipe)/i,
            /^aid[:;]\s*\*+/i,
            /^tid[:;]\s*\*+/i,
            /^nid[:;]\s*\*+/i,
            /^mid[:;]\s*\*+/i,
            /^auth\s+code[:;]/i,
            /^approval\s+code/i,

            // Footer instructions
            /^no\s+cardholder\s+verification/i,
            /^please\s+retain/i,
            /^retain\s+for/i,
            /^for\s+your\s+records/i,

            // ============ SMITH'S (KROGER) SPECIFIC PATTERNS ============
            // Store header info
            /^smith's$/i,
            /^smiths$/i,
            /^kroger$/i,
            /^\d+\s+s\.\s+maryland\s+pkwy/i, // Address patterns
            /^\(\d{3}\)\s+\d{3}-\d{4}/i, // Phone number patterns

            // Cashier and service info
            /^your\s+cashier\s+was/i,
            /^chec\s+\d+/i, // "CHEC 500"

            // Customer loyalty patterns
            /^fresh\s+value\s+customer/i,
            /^kroger\s+plus/i,
            /^fuel\s+points/i,
            /^you\s+earned/i,
            /^points\s+earned/i,

            // Weight/pricing calculation lines
            /^\d+\.\d+\s+lb\s*@\s*\$?\d+\.\d+\s*\/\s*lb/i, // "0.12 lb @ $1.99 / lb"
            /^wt\s+.*lb/i, // "WT" followed by weight info
            /^\d+\.\d+\s*\/\s*lb/i, // "$1.99 / lb"

            // Tax lines specific to Kroger/Smith's
            /^tax/i,
            /^\*+\s*balance/i,
            /^balance\s*\*+/i,

            // Receipt artifacts and codes
            /^f$/i, // Tax code "F"
            /^t$/i, // Tax code "T"
            /^[f|t]\s*$/i, // Standalone tax codes

            // OCR misreads of store-specific elements
            /^ro\s+lrg/i, // OCR misread of item codes
            /^darnc[n|g]/i, // OCR misread of "DANNON"
            /^spwd\s+gr/i, // OCR misread of item codes

            // ============ GENERIC OCR ARTIFACTS AND DISCOUNTS ============
            /^manual\s*weight/i,
            /^\d+\.\d+\s*lb\s*@\s*\d+\s*\d+\s*usd\/lb/i,
            /^[tx]\s+\d+\.\d+/i,
            /^\d+\.\d+%/i,
            /^=\s*\d+\.\d+$/i,
            /^[\d\s]{3,}$/,
            /^[a-z]{1,2}\s+[\d\s]+$/i,
            /^\d+\.\d+\s*@\s*\d+\.\d+%\s*=/i,
            /^\d+\.\d+\s*x\s*\$?\d+\.\d{2}$/i,
            /^\d+\.?\d*x?$/i,
            /^\d+\.?\d*\s*(lb|lbs|oz|kg|g|each|ea)$/i,
            /^\d+\s+.*\d+%.*\(\$\d+\.\d{2}\)$/i,
            /fuel\s*saver/i,
            /fuel\s*reward/i,
            /\d+\s+fuel\s+saver/i,
            /hormel\s*loins/i,
            /\d+\s+hormel\s*loins/i,
            /^(ia|iowa)\s+state/i,
            /^linn\s+county/i,
            /^[\w\s]+county\s+[\w\s]+\s+\d+\.\d+%/i,
            /^[\w\s]+state\s+[\w\s]+\s+\d+\.\d+%/i,
            /bottom\s*of\s*cart/i,
            /spend\s*\$?\d+/i,
            /\d+x\s*\d+of\d+/i,
            /^payment\s*information/i,
            /^total\s*paid/i,
            /^[a-z]\s*—?\s*$/i,
            /^\d+x\s*\$\d+\.\d+\s*[a-z]\s*—?\s*$/i,
            /deals\s*&?\s*coupons/i,
            /view\s*coupons/i,
        ];

        console.log(`📄 Processing ${lines.length} lines from receipt...`);

        // Process lines with enhanced context awareness
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
            const prevLine = i > 0 ? lines[i - 1] : '';

            // Skip common header/footer patterns
            if (skipPatterns.some(pattern => pattern.test(line))) {
                console.log(`📋 Skipping pattern match: ${line}`);
                continue;
            }

            // ============ ENHANCED TRADER JOE'S PROCESSING ============
            // Check for Trader Joe's quantity continuation pattern
            if (line.match(/^\d+\s*@\s*\$?\d+\.\d{2}$/i) && prevLine) {
                console.log(`📋 TJ's: Skipping quantity continuation line: ${line} (part of: ${prevLine})`);
                continue;
            }

            // Skip total amount that equals entire transaction
            if (line.match(/^fo\s+ui\s+geting/i)) {
                console.log(`📋 TJ's: Skipping transaction total line: ${line}`);
                continue;
            }

            // Check for lines that are just prices without descriptive text (likely totals)
            if (line.match(/^\$?\d+\.\d{2}$/)) {
                const linePrice = line.match(pricePattern);
                if (linePrice && parseFloat(linePrice[1]) > 25) { // Likely total if > $25
                    console.log(`📋 TJ's: Skipping likely total amount: ${line}`);
                    continue;
                }
            }

            // ============ ENHANCED SMITH'S (KROGER) PROCESSING ============
            // Skip weight information lines that are part of weighted items
            if (line.match(/^\d+\.\d+\s+lb\s*@\s*\$?\d+\.\d+\s*\/?\s*lb/i)) {
                console.log(`📋 Smith's: Skipping weight info line: ${line}`);
                continue;
            }

            // Skip lines that are clearly OCR artifacts from Smith's receipts
            if (line.match(/^[a-z]{1,3}\s*$/i) && line.length <= 4) {
                console.log(`📋 Smith's: Skipping short OCR artifact: ${line}`);
                continue;
            }

            // ============ ENHANCED PRICE DETECTION ============
            const priceMatch = line.match(pricePattern);
            if (priceMatch) {
                const price = parseFloat(priceMatch[1]);

                // Skip very high prices that are likely totals (over $50)
                if (price > 50) {
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

                // ============ ENHANCED TRADER JOE'S QUANTITY HANDLING ============
                // Check if next line contains Trader Joe's quantity information
                if (nextLine && nextLine.match(/^\d+\s*@\s*\$?\d+\.\d{2}$/i)) {
                    const qtyMatch = nextLine.match(/(\d+)\s*@\s*\$?(\d+\.\d{2})$/i);
                    if (qtyMatch) {
                        quantity = parseInt(qtyMatch[1]);
                        unitPrice = parseFloat(qtyMatch[2]);
                        itemPrice = quantity * unitPrice;
                        console.log(`📋 TJ's: Found quantity info in next line: ${quantity} @ $${unitPrice} = $${itemPrice}`);

                        // Verify the math matches the price on the main line
                        if (Math.abs(itemPrice - price) < 0.01) {
                            console.log(`📋 TJ's: Quantity math verified: ${quantity} × $${unitPrice} = $${itemPrice}`);
                        } else {
                            console.log(`📋 TJ's: Quantity math mismatch, using line price: $${price}`);
                            itemPrice = price;
                            quantity = 1;
                            unitPrice = price;
                        }
                    }
                }

                // ============ ENHANCED TARGET-STYLE QUANTITY HANDLING ============
                const embeddedQtyMatch = line.match(/^(.*?)\s+(\d+)\s*@\s*\$?(\d+\.\d{2})\s*ea/i);
                if (embeddedQtyMatch) {
                    nameMatch = embeddedQtyMatch[1];
                    quantity = parseInt(embeddedQtyMatch[2]);
                    unitPrice = parseFloat(embeddedQtyMatch[3]);
                    itemPrice = quantity * unitPrice;
                    console.log(`📋 Embedded quantity found: ${quantity} @ $${unitPrice}`);
                } else {
                    // Remove price from name
                    nameMatch = line.replace(pricePattern, '').trim();
                }

                // ============ ENHANCED NAME CLEANING ============
                nameMatch = cleanItemName(nameMatch);

                // ============ ENHANCED SMITH'S NAME PROCESSING ============
                // Handle Smith's specific abbreviations and OCR issues
                if (nameMatch.match(/^ro\s+lrg\s+white\s+bak/i)) {
                    nameMatch = "King's Hawaiian White Bread";
                } else if (nameMatch.match(/^darn?c?n?\s+l[ef]\s+yogu?rt/i)) {
                    nameMatch = "Dannon Light & Fit Yogurt";
                } else if (nameMatch.match(/^spwd\s+gr\s+mwc/i)) {
                    nameMatch = "Ground Turkey";
                } else if (nameMatch.match(/^silk\s+alm?ond/i)) {
                    nameMatch = "Silk Almond Milk";
                } else if (nameMatch.match(/^sara\s+ml?tgrn\s+bread/i)) {
                    nameMatch = "Sara Lee Multigrain Bread";
                } else if (nameMatch.match(/^csdt\s+tomato/i)) {
                    nameMatch = "Crushed Tomatoes";
                } else if (nameMatch.match(/^org\s+hummus/i)) {
                    nameMatch = "Organic Hummus";
                } else if (nameMatch.match(/^veggiecraft\s+pasta/i)) {
                    nameMatch = "Veggiecraft Pasta";
                } else if (nameMatch.match(/^kroger\s+carrots/i)) {
                    nameMatch = "Kroger Carrots";
                } else if (nameMatch.match(/^onions?\s+shallots?/i)) {
                    nameMatch = "Onions & Shallots";
                } else if (nameMatch.match(/^sto\s+parsley/i)) {
                    nameMatch = "Fresh Parsley";
                }

                // ============ ENHANCED TRADER JOE'S NAME PROCESSING ============
                // Handle common Trader Joe's item names and OCR issues
                if (nameMatch.match(/^org\s+mini\s+peanut\s+butter/i)) {
                    nameMatch = "Organic Mini Peanut Butter Cups";
                } else if (nameMatch.match(/^peanut\s+crunchy\s+crispy/i)) {
                    nameMatch = "Peanut Butter Crunchy & Crispy";
                } else if (nameMatch.match(/^cold\s+brew\s+coffee\s+bags/i)) {
                    nameMatch = "Cold Brew Coffee Bags";
                } else if (nameMatch.match(/^popcorn\s+synergistically/i)) {
                    nameMatch = "Synergistically Seasoned Popcorn";
                } else if (nameMatch.match(/^crackers\s+sandwich\s+every/i)) {
                    nameMatch = "Sandwich Crackers";
                }

                // Enhanced ground beef detection and cleaning (all stores)
                if (nameMatch.match(/^\d+%\s*\d+%\s*f\d+\s*grd\s*(re|bf|beef)/i)) {
                    const percentMatch = nameMatch.match(/^(\d+)%\s*(\d+)%\s*f\d+\s*grd\s*(re|bf|beef)/i);
                    if (percentMatch) {
                        nameMatch = `${percentMatch[1]}/${percentMatch[2]} Ground Beef`;
                    }
                }

                // Check for UPC in current or nearby lines
                const upcMatch = line.match(upcPattern) ||
                    (i > 0 ? lines[i - 1].match(upcPattern) : null) ||
                    (i < lines.length - 1 ? lines[i + 1].match(upcPattern) : null);

                // Only process if we have a meaningful item name
                if (nameMatch && nameMatch.length > 2 &&
                    !nameMatch.match(/^\d+\.?\d*$/) &&
                    !nameMatch.match(/^[tx]\s*\d/i) &&
                    !nameMatch.match(/^(visa|card|payment|total|balance)$/i)) {

                    console.log(`📋 Processing item: ${nameMatch} - Qty: ${quantity} @ $${unitPrice} = $${itemPrice}`);

                    const item = {
                        id: Date.now() + Math.random(),
                        name: nameMatch,
                        price: itemPrice,
                        quantity: quantity,
                        unitPrice: unitPrice,
                        upc: upcMatch ? upcMatch[0] : '',
                        category: guessCategory(nameMatch),
                        location: guessLocation(nameMatch),
                        rawText: line + (nextLine && nextLine.match(/^\d+\s*@.*$/i) ? ` + ${nextLine}` : ''),
                        selected: true,
                        needsReview: false
                    };

                    items.push(item);
                } else {
                    console.log(`📋 Skipping line with insufficient name: "${nameMatch}" from "${line}"`);
                }
            }
        }

        console.log(`📋 Extracted ${items.length} items from receipt`);
        return combineDuplicateItems(items);
    }

// Enhanced cleanItemName function
    function combineDuplicateItems(items) {
        const upcGroups = {};
        const nameGroups = {};

        // First pass: Group by UPC code (most reliable)
        items.forEach(item => {
            if (item.upc && item.upc.length >= 11) {
                // Clean UPC for consistent matching
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
                // Single item, no combining needed
                combinedItems.push(group[0]);
            } else {
                // Multiple items with same UPC - combine them
                const firstItem = group[0];
                const totalQuantity = group.reduce((sum, item) => sum + item.quantity, 0);
                const totalPrice = group.reduce((sum, item) => sum + item.price, 0);
                const unitPrice = group.length > 1 ? (totalPrice / totalQuantity) : firstItem.unitPrice;

                // Create combined item
                const combinedItem = {
                    ...firstItem,
                    quantity: totalQuantity,
                    price: totalPrice,
                    unitPrice: unitPrice,
                    rawText: `${group.length} identical items combined (UPC): ${firstItem.rawText}`,
                    id: Date.now() + Math.random() // New ID for combined item
                };

                combinedItems.push(combinedItem);

                console.log(`Combined ${group.length} items with UPC ${firstItem.upc}: ${firstItem.name} (Total qty: ${totalQuantity})`);
            }
        });

        // Process name groups (items without UPC)
        Object.values(nameGroups).forEach(group => {
            if (group.length === 1) {
                // Single item, no combining needed
                combinedItems.push(group[0]);
            } else {
                // Multiple items with same name - combine them
                const firstItem = group[0];
                const totalQuantity = group.reduce((sum, item) => sum + item.quantity, 0);
                const totalPrice = group.reduce((sum, item) => sum + item.price, 0);
                const unitPrice = group.length > 1 ? (totalPrice / totalQuantity) : firstItem.unitPrice;

                // Create combined item
                const combinedItem = {
                    ...firstItem,
                    quantity: totalQuantity,
                    price: totalPrice,
                    unitPrice: unitPrice,
                    rawText: `${group.length} identical items combined (name): ${firstItem.rawText}`,
                    id: Date.now() + Math.random() // New ID for combined item
                };

                combinedItems.push(combinedItem);

                console.log(`Combined ${group.length} items by name: ${firstItem.name} (Total qty: ${totalQuantity})`);
            }
        });

        return combinedItems;
    }

// Enhanced cleanItemName function with support for all stores
    function cleanItemName(name) {
        // Remove UPC codes at the beginning (Target and others put them first)
        name = name.replace(/^\d{8,}\s+/, '');

        // Remove common store tax codes and artifacts
        name = name.replace(/\s+NF\s*$/i, ''); // Remove "NF" tax code (Target)
        name = name.replace(/\s+T\s*$/i, '');  // Remove "T" tax code (Target)
        name = name.replace(/\s+F\s*$/i, '');  // Remove "F" tax code (Smith's)
        name = name.replace(/\s+HOME\s*$/i, ''); // Remove "HOME" section indicator (Target)

        // Remove quantity patterns that might have been missed
        name = name.replace(/\s*\d+\s*@\s*\$?\d+\.\d{2}.*$/i, '');

        // Remove long product codes and discount info
        name = name.replace(/^\d{10,}/, '').trim(); // Remove long product codes
        name = name.replace(/\d+%:?/, '').trim(); // Remove percentage info
        name = name.replace(/\(\$\d+\.\d{2}\)/, '').trim(); // Remove discount amounts
        name = name.replace(/[-\s]*[nt]$/i, '').trim(); // Remove -N or -T suffixes
        name = name.replace(/\s*-\s*$/, '').trim(); // Remove trailing dash

        // Handle specific brand conversions for all stores
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

// Enhanced guessCategory function with better recognition for all stores
    function guessCategory(name) {
        const nameLower = name.toLowerCase();

        // Dairy products
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

        // Frozen items
        if (nameLower.includes('birds eye') || nameLower.includes('frozen vegetable')) {
            return 'Frozen Vegetables';
        }
        if (nameLower.includes('frosty paws') || nameLower.includes('ice cream') || nameLower.includes('frozen treat')) {
            return 'Frozen Fruit';
        }

        // Specialty items
        if (nameLower.includes('hummus')) {
            return 'Condiments';
        }

        return 'Other';
    }

// Enhanced guessLocation function with kitchen cabinets option
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

    // Update item, toggle selection, UPC lookup functions (keeping existing logic)
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

        async function tryUPCLookup(upcCode) {
            const response = await fetch(`/api/upc/lookup?upc=${upcCode}`);
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

            if (originalUPC.length === 11) {
                const paddedUPC = '0' + originalUPC;
                upcVariations.push(paddedUPC);

                const checkDigit = calculateUPCCheckDigit(paddedUPC);
                if (checkDigit !== null) {
                    calculatedVariation = paddedUPC + checkDigit;
                    upcVariations.push(calculatedVariation);
                }
            }

            if (originalUPC.length === 13) {
                const truncatedUPC = originalUPC.slice(0, -1);
                const checkDigit = calculateUPCCheckDigit(truncatedUPC);
                if (checkDigit !== null) {
                    calculatedVariation = truncatedUPC + checkDigit;
                    upcVariations.push(calculatedVariation);
                }
            }

            console.log(`📱 iOS PWA UPC lookup for ${originalUPC}. Calculated variation: ${calculatedVariation}`);

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
                    console.log(`📱 iOS PWA UPC ${upcCode} failed:`, error.message);
                    continue;
                }
            }

            const shouldTryAll = confirm(`❓ Smart UPC lookup failed for ${originalUPC}.\n\nTry checking all possible check digits? This will make multiple API calls.`);

            if (shouldTryAll && originalUPC.length === 12) {
                console.log('📱 iOS PWA: User approved brute force UPC search');

                for (let i = 0; i <= 9; i++) {
                    const testUPC = originalUPC + i;

                    if (calculatedVariation && testUPC === calculatedVariation) {
                        continue;
                    }

                    try {
                        const data = await tryUPCLookup(testUPC);

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

            const attemptedCount = shouldTryAll ? 'all variations' : `${upcVariations.length} smart variations`;
            alert(`❌ Product not found for UPC ${originalUPC} (tried ${attemptedCount})`);

        } catch (error) {
            console.error('❌ iOS PWA UPC lookup error:', error);
            alert('❌ Network error during UPC lookup. Please check your connection and try again.');
        }
    }

    // Add selected items to inventory
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
                fetch('/api/inventory', {
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
            console.error('❌ iOS PWA Error adding items:', error);
            alert('Error adding some items. Please try again.');
            setStep('review');
        }
    }

    // Report issue functionality
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

    // Handle report modal file uploads
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
            formData.append('isPWA', isPWA.toString());
            formData.append('userAgent', navigator.userAgent);

            if (reportData.receiptImage) {
                const response = await fetch(reportData.receiptImage);
                const blob = await response.blob();
                formData.append('receiptImage', blob, 'receipt.jpg');
            }

            reportData.additionalFiles.forEach((file, index) => {
                formData.append(`additionalFile_${index}`, file, file.name);
            });

            const response = await fetch('/api/receipt-issue-report', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('✅ Thank you! Your iOS PWA issue report has been sent. We\'ll work on improving the receipt scanner.');
                setShowReportModal(false);
            } else {
                throw new Error('Failed to send report');
            }
        } catch (error) {
            console.error('❌ iOS PWA Error sending issue report:', error);
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

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Enhanced Header with iOS PWA indicator */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">📄 Receipt Scanner</h1>
                            <div className="flex items-center space-x-2">
                                <p className="text-gray-600">Scan your receipt to quickly add items to inventory</p>
                                {isPWA && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                        iOS PWA
                                    </span>
                                )}
                            </div>
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
                                        {isPWA && ' (iOS PWA Mode)'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Enhanced Camera Option for iOS PWA */}
                                    <TouchEnhancedButton
                                        onClick={startCamera}
                                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                    >
                                        <div className="text-4xl mb-2">📷</div>
                                        <div className="text-lg font-medium text-indigo-700">Take Photo</div>
                                        <div className="text-sm text-gray-500">
                                            {isPWA ? 'Use camera (iOS PWA)' : 'Use device camera'}
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

                                {/* Enhanced Error display for iOS PWA */}
                                {cameraError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="text-red-700">❌ {cameraError}</div>
                                        <div className="text-sm text-red-600 mt-2">
                                            {isPWA ? (
                                                <>
                                                    iOS PWA camera permissions are reset each session. Please allow camera access and try again.
                                                    {'\n\n'}
                                                    If issues persist, try opening the app in Safari browser first.
                                                </>
                                            ) : (
                                                'Please try using the upload option instead, or check your camera permissions.'
                                            )}
                                        </div>

                                        {isPWA && (
                                            <div className="mt-3">
                                                <TouchEnhancedButton
                                                    onClick={() => {
                                                        if (confirm('Try opening this app in Safari browser instead?\n\nThis may resolve iOS PWA camera issues.')) {
                                                            window.location.href = window.location.href;
                                                        }
                                                    }}
                                                    className="px-3 py-1 bg-orange-600 text-white rounded text-sm"
                                                >
                                                    🌐 Open in Safari
                                                </TouchEnhancedButton>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Enhanced Tips for iOS PWA */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-blue-900 mb-2">📝 Tips for Best Results:</h4>
                                    <ul className="text-sm text-blue-800 space-y-1">
                                        <li>• Ensure receipt is flat and well-lit</li>
                                        <li>• Avoid shadows and glare</li>
                                        <li>• Include the entire receipt in the frame</li>
                                        <li>• Higher resolution images work better</li>
                                        {isPWA && <li>• iOS PWA may take longer to initialize camera</li>}
                                    </ul>
                                </div>

                                {/* Enhanced Report Issue Section for iOS PWA */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-yellow-900 mb-2">🐛 Having Issues?</h4>
                                    <p className="text-sm text-yellow-800 mb-3">
                                        If the receipt scanner isn't working properly with your receipt
                                        {isPWA && ' (especially in iOS PWA mode)'}, you can report
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

                        {/* Enhanced Camera View for iOS PWA */}
                        {showCamera && (
                            <div className="space-y-4" data-camera-container>
                                <div className="text-center">
                                    <h3 className="text-lg font-medium mb-4">
                                        📷 Camera View {isPWA && '(iOS PWA)'}
                                    </h3>
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
                                    />

                                    {/* Enhanced overlay for iOS PWA */}
                                    <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg pointer-events-none">
                                        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                            📱 Position receipt here {isPWA && '(iOS PWA)'}
                                        </div>
                                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                            📏 Fill frame completely
                                        </div>
                                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                            ✨ Keep receipt flat and well-lit
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

                                {/* Enhanced debug info for iOS PWA */}
                                <div className="text-xs text-center bg-gray-100 p-2 rounded text-gray-600">
                                    Camera: {videoRef.current?.videoWidth || 0} x {videoRef.current?.videoHeight || 0}
                                    {isPWA && ' • iOS PWA Mode'}
                                </div>

                                {/* Auto-scroll indicator for user feedback */}
                                <div className="text-xs text-center text-blue-600 bg-blue-50 p-2 rounded">
                                    📱 Camera view opened • Scrolled automatically to camera
                                </div>
                            </div>
                        )}

                        {/* Step 2: Enhanced Processing for iOS PWA */}
                        {step === 'processing' && (
                            <div className="text-center space-y-6">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-lg font-medium text-gray-900">
                                    Processing Receipt {isPWA && '(iOS PWA)'}
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {processingStatus}
                                </p>

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

                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>

                                {isPWA && (
                                    <div className="text-xs text-orange-600 mt-2">
                                        iOS PWA processing may take slightly longer
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Review Items (keeping existing UI with iOS PWA enhancements) */}
                        {step === 'review' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">
                                            Review Extracted Items {isPWA && '(iOS PWA)'}
                                        </h3>
                                        <p className="text-gray-600">
                                            {extractedItems.filter(item => item.selected).length} of {extractedItems.length} items selected
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
                                            No items were extracted from the receipt. Please try again with a clearer image.
                                            {isPWA && ' iOS PWA OCR processing may be affected by image quality.'}
                                        </div>
                                    ) : (
                                        extractedItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`border rounded-lg p-4 ${item.selected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.selected}
                                                        onChange={() => toggleItemSelection(item.id)}
                                                        className="mt-1 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                    />

                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Item Name
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={item.name}
                                                                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Category
                                                            </label>
                                                            <select
                                                                value={item.category}
                                                                onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                            >
                                                                <option value="Other">Other</option>
                                                                <option value="Fresh Vegetables">Fresh Vegetables</option>
                                                                <option value="Fresh Fruits">Fresh Fruits</option>
                                                                <option value="Fresh Spices">Fresh Spices</option>
                                                                <option value="Dairy">Dairy</option>
                                                                <option value="Cheese">Cheese</option>
                                                                <option value="Eggs">Eggs</option>
                                                                <option value="Fresh/Frozen Poultry">Fresh/Frozen Poultry</option>
                                                                <option value="Fresh/Frozen Beef">Fresh/Frozen Beef</option>
                                                                <option value="Fresh/Frozen Pork">Fresh/Frozen Pork</option>
                                                                <option value="Fresh/Frozen Lamb">Fresh/Frozen Lamb</option>
                                                                <option value="Fresh/Frozen Rabbit">Fresh/Frozen Rabbit</option>
                                                                <option value="Fresh/Frozen Venison">Fresh/Frozen Venison</option>
                                                                <option value="Fresh/Frozen Fish & Seafood">Fresh/Frozen Fish & Seafood</option>
                                                                <option value="Beans">Beans</option>
                                                                <option value="Canned Meat">Canned/Jarred Meat</option>
                                                                <option value="Canned Vegetables">Canned/Jarred Vegetables</option>
                                                                <option value="Canned Fruit">Canned/Jarred Fruit</option>
                                                                <option value="Canned Sauces">Canned/Jarred Sauces</option>
                                                                <option value="Canned Tomatoes">Canned/Jarred Tomatoes</option>
                                                                <option value="Canned Beans">Canned/Jarred Beans</option>
                                                                <option value="Canned Meals">Canned/Jarred Meals</option>
                                                                <option value="Frozen Vegetables">Frozen Vegetables</option>
                                                                <option value="Frozen Fruit">Frozen Fruit</option>
                                                                <option value="Grains">Grains</option>
                                                                <option value="Breads">Breads</option>
                                                                <option value="Pasta">Pasta</option>
                                                                <option value="Stuffing & Sides">Stuffing & Sides</option>
                                                                <option value="Boxed Meals">Boxed Meals</option>
                                                                <option value="Seasonings">Seasonings</option>
                                                                <option value="Spices">Spices</option>
                                                                <option value="Bouillon">Bouillon</option>
                                                                <option value="Stock/Broth">Stock/Broth</option>
                                                                <option value="Beverages">Beverages</option>
                                                                <option value="Snacks">Snacks</option>
                                                                <option value="Condiments">Condiments</option>
                                                            </select>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
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

                        {/* Step 4: Enhanced Adding to Inventory for iOS PWA */}
                        {step === 'adding' && (
                            <div className="text-center space-y-6">
                                <div className="text-6xl mb-4">📦</div>
                                <h3 className="text-lg font-medium text-gray-900">
                                    Adding Items to Inventory {isPWA && '(iOS PWA)'}
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {processingStatus}
                                </p>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hidden canvas for photo capture - Always rendered */}
                <canvas ref={canvasRef} className="hidden"/>

                {/* Enhanced Report Issue Modal for iOS PWA */}
                {showReportModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        📧 Report Receipt Issue {isPWA && '(iOS PWA)'}
                                    </h3>
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
                                            <option value="camera-not-working">Camera not working</option>
                                            <option value="camera-black-screen">Camera shows black screen</option>
                                            <option value="ios-pwa-camera-issues">iOS PWA camera issues</option>
                                            <option value="ocr-poor-accuracy">Poor text recognition</option>
                                            <option value="wrong-items-detected">Wrong items detected</option>
                                            <option value="missing-items">Items not detected</option>
                                            <option value="categories-wrong">Wrong categories assigned</option>
                                            <option value="upc-lookup-failed">UPC lookup not working</option>
                                            <option value="app-crash">App crashed/froze</option>
                                            <option value="permission-issues">Camera permission issues</option>
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
                                                Upload screenshots showing the issue. Supports: JPG, PNG, GIF, WebP (max 10MB each)
                                            </p>

                                            {reportData.additionalFiles.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium text-gray-700">
                                                        Files to be sent ({reportData.additionalFiles.length}):
                                                    </p>
                                                    {reportData.additionalFiles.map((file, index) => (
                                                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
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
                                            📝 <strong>Your iOS PWA report will include:</strong>
                                        </p>
                                        <ul className="text-sm text-blue-700 mt-1 space-y-1">
                                            <li>• Your issue description</li>
                                            {capturedImage && <li>• Receipt image</li>}
                                            {reportData.additionalFiles.length > 0 && (
                                                <li>• {reportData.additionalFiles.length} additional screenshot{reportData.additionalFiles.length > 1 ? 's' : ''}</li>
                                            )}
                                            <li>• Browser and device information</li>
                                            <li>• iOS PWA mode status</li>
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