// file: /src/app/inventory/receipt-scan/page.js - v5 Receipt scanning with OCR - Added Kitchen Cabinets location option

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
    const [reportData, setReportData] = useState({
        issue: '',
        description: '',
        email: '',
        receiptImage: null,
        additionalFiles: []
    });

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

    // Enhanced camera start function with better quality settings
    async function startCamera() {
        setCameraError(null);

        try {
            // Check camera support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported');
            }

            // Stop any existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            // Enhanced camera constraints for better OCR quality
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: {ideal: 1920, min: 1280}, // Higher resolution
                    height: {ideal: 1080, min: 720},
                    aspectRatio: {ideal: 16 / 9},
                    focusMode: 'continuous', // Continuous autofocus
                    exposureMode: 'continuous', // Auto exposure
                    whiteBalanceMode: 'continuous', // Auto white balance
                    advanced: [
                        {focusMode: 'continuous'},
                        {exposureMode: 'continuous'},
                        {whiteBalanceMode: 'continuous'}
                    ]
                }
            };

            // Try enhanced constraints first, fall back to basic if needed
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (enhancedError) {
                console.log('Enhanced constraints failed, trying basic constraints:', enhancedError);
                // Fallback to basic constraints
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: {ideal: 1280},
                        height: {ideal: 720}
                    }
                });
            }

            streamRef.current = stream;

            // Show camera first to ensure video element is rendered
            setShowCamera(true);

            // Wait for video element to render
            await new Promise(resolve => setTimeout(resolve, 100));

            // Wait for video element with retries
            let retries = 0;
            while (!videoRef.current && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }

            if (!videoRef.current) {
                setCameraError('Video element not found after waiting');
                return;
            }

            // Set video source
            videoRef.current.srcObject = stream;

            // Wait for video to load with better settings
            await new Promise((resolve, reject) => {
                const video = videoRef.current;

                const onLoadedMetadata = () => {
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);

                    // Log actual video dimensions for debugging
                    console.log(`Camera resolution: ${video.videoWidth}x${video.videoHeight}`);

                    resolve();
                };

                const onError = (e) => {
                    video.removeEventListener('error', onError);
                    reject(e);
                };

                video.addEventListener('loadedmetadata', onLoadedMetadata);
                video.addEventListener('error', onError);

                // Force play with better settings
                video.play().catch(() => {
                    // Ignore play errors - common on mobile
                });
            });

        } catch (error) {
            setCameraError('Failed to start camera: ' + error.message);
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

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Use full video resolution for better OCR
        const width = video.videoWidth;
        const height = video.videoHeight;

        console.log(`Capturing at resolution: ${width}x${height}`);

        // Set canvas size to match video (high resolution)
        canvas.width = width;
        canvas.height = height;

        // Enhanced canvas drawing with better quality settings
        context.imageSmoothingEnabled = false; // Disable smoothing for sharper text
        context.textRenderingOptimization = 'optimizeLegibility';

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, width, height);

        // Optional: Apply image enhancements for better OCR
        const imageData = context.getImageData(0, 0, width, height);
        const enhancedImageData = enhanceImageForOCR(imageData);
        context.putImageData(enhancedImageData, 0, 0);

        // Convert to blob with high quality settings
        canvas.toBlob((blob) => {
            if (blob) {
                console.log(`Captured image size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

                const imageUrl = URL.createObjectURL(blob);
                setCapturedImage(imageUrl);
                stopCamera();
                processImage(blob);
            }
        }, 'image/jpeg', 0.95); // Higher quality (95% instead of 90%)
    }

    // Image enhancement function for better OCR
    function enhanceImageForOCR(imageData) {
        const data = imageData.data;
        const length = data.length;

        // Apply contrast and brightness enhancement
        const contrast = 1.2; // Increase contrast
        const brightness = 10; // Slight brightness increase

        for (let i = 0; i < length; i += 4) {
            // Apply contrast and brightness to RGB channels
            data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128 + brightness));     // Red
            data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128 + brightness)); // Green
            data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128 + brightness)); // Blue
            // Alpha channel (data[i + 3]) remains unchanged
        }

        return imageData;
    }

    // Enhanced OCR processing with better settings
    async function processImage(imageFile) {
        setIsProcessing(true);
        setStep('processing');
        setOcrProgress(0);
        setProcessingStatus('Initializing OCR...');

        try {
            // Dynamically import Tesseract.js
            setProcessingStatus('Loading OCR engine...');
            const Tesseract = (await import('tesseract.js')).default;

            setProcessingStatus('Processing image...');

            // Enhanced OCR options for better accuracy
            const ocrOptions = {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        setOcrProgress(progress);
                        setProcessingStatus(`Extracting text... ${progress}%`);
                    }
                },
                // Enhanced OCR parameters
                tessedit_pageseg_mode: '6', // Uniform block of text
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$/()@-: ',
                preserve_interword_spaces: '1',
                user_defined_dpi: '300' // Higher DPI for better recognition
            };

            const {data: {text}} = await Tesseract.recognize(
                imageFile,
                'eng',
                ocrOptions
            );

            setProcessingStatus('Analyzing receipt...');

            // Parse extracted text into items
            const items = parseReceiptText(text);

            // Log results for debugging
            console.log('OCR Text:', text);
            console.log('Parsed Items:', items);

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


    // FIXED: Handle receipt file upload (renamed to avoid conflict)
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

    // Parse receipt text into structured items
    function parseReceiptText(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const items = [];

        // Common patterns for receipt items
        const pricePattern = /\$?(\d+\.\d{2})/;
        const upcPattern = /\b\d{12,14}\b/;
        const quantityPattern = /(\d+)\s*@\s*\$?(\d+\.\d{2})/;

        // Enhanced skip patterns with ALL store-specific patterns
        const skipPatterns = [
            // Store names and basic headers
            /^(walmart|target|kroger|publix|safeway|hy-vee|hyvee|sam's club|sams club|costco)/i,
            /^(total|subtotal|tax|change|card|cash)/i,
            /^(thank you|receipt|store|phone|address)/i,
            /^\d{2}\/\d{2}\/\d{4}/,
            /^[\d\s\-\(\)]+$/,

            // Payment and transaction lines
            /^(debit|credit|card|cash|tend|tender)/i,
            /^(debit tend|credit tend|cash tend)/i,
            /^(payment|transaction|approval)/i,
            /^(ref|reference|auth|authorization)/i,

            // Receipt footer information
            /^(change due|amount due|balance)/i,
            /^(customer|member|rewards)/i,
            /^(save|saved|you saved)/i,
            /^(coupon|discount|promotion)/i,

            // Store operation codes and IDs
            /^(st#|store|op|operator|te|terminal)/i,
            /^(tc#|transaction|seq|sequence)/i,
            /^[\d\s]{10,}$/, // Long strings of numbers and spaces

            // Items sold counter
            /^#?\s*items?\s+sold/i,
            /^\d+\s+items?\s+sold/i,

            // Barcode numbers (standalone)
            /^[\d\s]{15,}$/,

            // ============ HY-VEE SPECIFIC PATTERNS ============
            // Hy-Vee subtotal and total patterns
            /^(sub-total|subtotal|sub total)/i,
            /^(net amount|netamount|net)/i,
            /^(total|amount)$/i,
            /^subtotal\s*\[\d+\]/i, // "SUBTOTAL [18]"

            // Bottle deposit lines - these are fees, not inventory items
            /btl\s+dep/i,        // "BTL DEP"
            /btl\.\s+dep/i,        // "BTL.DEP"
            /bottle\s+deposit/i,  // "BOTTLE DEPOSIT"
            /deposit/i,           // Generic deposit
            /^\.?\d+\s*fs?\s*btl\s*dep/i, // ".30 FS BTL DEP"

            // Bottle deposit with OCR periods/punctuation
            /btl\.\s+dep/i,        // "BTL.DEP" - OCR adds periods
            /btl\s*\.\s*dep/i,     // "BTL . DEP" - OCR with spaced periods
            /bottle\.\s+deposit/i, // "BOTTLE.DEPOSIT"

            // Tax calculation lines (based on actual OCR output)
            /^[;]*\s*[xi]\s+\d+\.\d+\s*@\s*\d+\.\d+%\s*=\s*\d+\.\d+$/i, // "; X 23.93 @ 6.000% = 1.44"
            /^[ti]\s+\d+\.\d+\s*@\s*\d+\.\d+%\s*=\s*\d+\.\d+$/i,        // "I 23.93 @ 1.000% = 0.24"

            // Variations with punctuation and OCR artifacts
            /^[;:]*\s*[xti]\s+\d+\.\d+\s*@/i,                             // Lines starting with punctuation + X/T/I + number @
            /^[xti]\s+\d+\.\d+\s*@\s*\d+\.\d+%/i,                        // Tax calculation format
            /^\d+\.\d+\s*@\s*\d+\.\d+%\s*=\s*\d+\.\d+$/i,               // Direct calculation without prefix

            // Also add these additional OCR artifact patterns:
            /^manual\s*weight/i,                                          // "Manual Weight" (sometimes with OCR errors)
            /^\d+\.\d+\s*lb\s*@\s*\d+\s*\d+\s*usd\/lb/i,                // Weight calculation line

            // Tax reference fragments (OCR splitting)
            /^x\s+\d+\s+\d+\s+\d+$/i,    // "X 6 1 44" - tax calculation fragments
            /^[tx]\s+\d+(\s+\d+)*$/i,    // "T 23" or "X 6 1 44" patterns

            // Subtotal/total fragments (OCR number splitting)
            /^\d+\s+\d+\s+\d+\s+\d+$/i,  // "1 1 0 24" - numbers split by OCR
            /^\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}$/i, // Specific pattern for split totals

            // Receipt formatting artifacts
            /^[\d\s]+\d{2}$/i,           // Lines that are just spaced numbers ending in 2 digits
            /^[a-z]\s+[\d\s]+$/i,        // Single letter followed by spaced numbers

            // Mathematical operation fragments
            /^@\s*\d+\.\d+%/i,           // "@ 6.000%" - calculation fragments
            /^=\s*[\d\s]+$/i,            // "= 1 44" - result fragments
            /^\d+\.\d+%\s*=?$/i,         // "6.000% =" - percentage fragments

            // OCR misreads of common receipt elements
            /^sub\s*total\s*[\[\d\]]*$/i, // "SUB TOTAL [18]" or variations
            /^total\s*[\[\d\]]*$/i,       // "TOTAL [18]" or variations

            // Additional Hy-Vee specific OCR issues
            /employee\s*owned/i,          // Header text
            /storeman/i,                  // "StoreManagement" fragments
            /group.*hy.*vee/i,           // URL fragments

            // Generic OCR line-splitting artifacts
            /^[\d\s]{3,}$/,              // Lines of just numbers and spaces (3+ chars)
            /^[a-z]{1,2}\s+[\d\s]+$/i,   // 1-2 letters followed by spaced numbers

            // Tax calculation lines
            /^\d+\.\d+\s*@\s*\d+\.\d+%\s*=/i, // "23.93 @ 6.000% = 1.44"
            /^[tx]\s+\d+\.\d+\s*@/i, // "T 23.93 @"

            // Standalone tax/percentage lines
            /^\d+\.\d+%\s*=/i,    // "6.000% = 1.44"
            /^=\s*\d+\.\d+$/i,    // "= 1.44"

            // Weight and measurement lines
            /^\d+\.?\d*\s*x\s*\$?\d+\.?\d*$/i,
            /^\d+\.\d+\s*lb\s*@/i, // "10.258 LB @"
            /manual\s*weight/i,    // "Manual Weight"
            /^\d+\.\d+\s*usd\/lb/i, // "2.98 USD/LB"

            // Discount/savings lines (negative amounts or percentage discounts)
            /^\d+%?\s*(off|discount|save)/i,
            /^\(\$\d+\.\d{2}\)$/,  // Negative amounts in parentheses
            /^-\$?\d+\.\d{2}$/,    // Negative amounts with minus sign

            // Product codes that aren't actual items
            /^\d{10,}$/,

            // Weight only lines
            /^\d+\.?\d*x?$/i,

            // Lines that are just numbers and measurement units
            /^\d+\.?\d*\s*(lb|lbs|oz|kg|g|each|ea)$/i,

            // Discount lines with product codes and percentages
            /^\d+\s+.*\d+%.*\(\$\d+\.\d{2}\)$/i,

            // Fuel rewards and loyalty programs
            /fuel\s*saver/i,
            /fuel\s*reward/i,
            /\d+\s+fuel\s+saver/i,
            /hormel\s*loins/i,
            /\d+\s+hormel\s*loins/i,

            // Tax lines
            /^(ia|iowa)\s+state/i,
            /^linn\s+county/i,
            /^[\w\s]+county\s+[\w\s]+\s+\d+\.\d+%/i,
            /^[\w\s]+state\s+[\w\s]+\s+\d+\.\d+%/i,

            // Cart and spending promotions
            /bottom\s*of\s*cart/i,
            /spend\s*\$?\d+/i,
            /\d+x\s*\d+of\d+/i,

            // Payment information section
            /^payment\s*information/i,
            /^total\s*paid/i,

            // OCR parsing errors
            /^[a-z]\s*—?\s*$/i,
            /^\d+x\s*\$\d+\.\d+\s*[a-z]\s*—?\s*$/i,

            // Deals and coupons section
            /deals\s*&?\s*coupons/i,
            /view\s*coupons/i,

            // ============ SAM'S CLUB SPECIFIC PATTERNS ============
            // Instant Savings (V INST SV) - These are discounts, not items
            /^v\s+inst\s+sv/i,
            /^e\s+v\s+inst\s+sv/i,
            /^v\s+inst\s+sv.*\d+\.\d{2}[-\s]*[nt]$/i,

            // Sam's Club specific instant savings patterns
            /inst\s+sv.*[-\s]*[nt]$/i,
            /instant\s+sav/i,

            // Sam's Club membership and payment lines
            /^(member|membership)/i,
            /^(plus|advantage)/i,

            // Sam's Club specific discount patterns
            /^\d+\.\d{2}[-\s]*[nt]$/i, // Prices ending with -N or -T (negative)

            // Payment due and tender lines
            /tenbe\s*due/i,
            /tender\s*due/i,
            /change\s*due/i,
            /amount\s*due/i,
            /balance\s*due/i,

            // Card transaction lines
            /voided\s*bankcard/i,
            /bank\s*card/i,
            /transaction\s*not\s*complete/i,

            // Sam's Club specific footer patterns
            /^es\s*\|?\s*~?tenbe/i, // "Es |~TENBE DUE"
            /^es\s*\|?\s*~?tender/i,
            /^es\s*\|?\s*~?change/i,

            // Generic payment completion patterns
            /transaction\s*complete/i,
            /transaction\s*not\s*complete/i,
            /debit\s*tend/i,
            /cash\s*tend/i,

            // Sam's Club specific codes and IDs
            /terminal\s*#/i,
            /^[\d\s]{8,}$/,  // Long number sequences (transaction IDs)

            // Additional negative amount patterns
            /\d+\.\d{2}[-\s]*n$/i,  // Amounts ending with -N
            /\d+\.\d{2}[-\s]*t$/i,   // Amounts ending with -T

            // ============ TARGET SPECIFIC PATTERNS ============
            // Quantity-only lines (these are part of the previous item)
            /^\d+\s*@\s*\$?\d+\.\d{2}\s*ea$/i,        // "2 @ $3.89 ea"
            /^\d+\s*@\s*\$?\d+\.\d{2}$/i,             // "2 @ $3.89"
            /^\d+\s*ea$/i,                            // "2 ea"
            /^ea$/i,                                  // Just "ea"

            // Regular price lines (discount information)
            /^regular\s+price/i,                      // "Regular Price $5.59"
            /^reg\s+price/i,                          // "Reg Price"
            /^was\s+\$?\d+\.\d{2}/i,                 // "Was $5.59"

            // Target tax calculation patterns
            /^t\s*=\s*ia\s+tax/i,                    // "T = IA TAX 7.00000 on $15.96"
            /^[t]\s*-\s*ia\s+tax/i,                  // Variations with dash
            /^\d+\.\d+\s*on\s*\$?\d+\.\d{2}/i,      // "7.00000 on $15.96"

            // Payment method lines
            /^\*?\d{4}\s+debit\s+total/i,            // "*8642 DEBIT TOTAL PAYMENT"
            /^aid[:;]\s*[a-z0-9]+/i,                 // "AID: A000000098040"
            /^auth\s+code[:;]/i,                     // "AUTH CODE: 395098"
            /^us\s+debit/i,                          // "US DEBIT"

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
            /\d{3}-\d{3}-\d{4}/i,  // Phone numbers

            // Additional Target-specific footer patterns
            /^nf$/i,               // Tax code "NF"
            /^t$/i,                // Tax code "T"

            // Standalone letters/codes that appear on separate lines
            /^[a-z]$/i,            // Single letters
            /^[nt]$/i,             // N or T codes

            // Store section headers
            /^grocery$/i,
            /^home$/i,
            /^electronics$/i,
            /^clothing$/i,
        ];

        // Process lines with context awareness
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
            const prevLine = i > 0 ? lines[i - 1] : '';

            // Skip common header/footer patterns
            if (skipPatterns.some(pattern => pattern.test(line))) {
                console.log(`Skipping pattern match: ${line}`);
                continue;
            }

            // ============ ENHANCED HY-VEE FILTERING ============
            // Skip bottle deposit lines specifically
            if (line.match(/btl\s+dep/i) || line.match(/bottle\s+deposit/i)) {
                console.log(`Skipping bottle deposit: ${line}`);
                continue;
            }

            // Skip tax calculation lines
            if (line.match(/^\d+\.\d+\s*@\s*\d+\.\d+%\s*=/i)) {
                console.log(`Skipping tax calculation: ${line}`);
                continue;
            }

            // Skip weight information lines
            if (line.match(/manual\s*weight/i) || line.match(/^\d+\.\d+\s*lb\s*@/i)) {
                console.log(`Skipping weight info: ${line}`);
                continue;
            }

            // Skip lines that are just mathematical calculations or references
            if (line.match(/^[tx]\s+\d+\.\d+/i) || line.match(/^\d+\.\d+%/i) || line.match(/^=\s*\d+\.\d+$/i)) {
                console.log(`Skipping calculation line: ${line}`);
                continue;
            }

            // ============ ENHANCED SAM'S CLUB FILTERING ============
            // Skip lines that are clearly instant savings (discounts)
            if (line.match(/^.*inst.*sv.*\d+\.\d{2}[-\s]*[nt]$/i)) {
                console.log(`Skipping instant savings: ${line}`);
                continue;
            }

            // Skip lines with negative amounts (discounts)
            if (line.match(/\d+\.\d{2}[-\s]*[nt]$/i)) {
                console.log(`Skipping negative amount: ${line}`);
                continue;
            }

            // Skip zero-amount lines (like "Es |~TENBE DUE 0.00")
            if (line.match(/\$?0\.00/i)) {
                console.log(`Skipping zero amount: ${line}`);
                continue;
            }

            // Skip payment/tender related lines
            if (line.match(/(tenbe|tender|change|due|balance|paid)/i)) {
                console.log(`Skipping payment line: ${line}`);
                continue;
            }

            // ============ TARGET-SPECIFIC PROCESSING ============
            // Skip if this line is just a quantity/price continuation of previous item
            if (line.match(/^\d+\s*@\s*\$?\d+\.\d{2}\s*ea$/i) && prevLine) {
                console.log(`Skipping quantity line (part of previous item): ${line}`);
                continue;
            }

            // Skip regular price lines
            if (line.match(/^regular\s+price/i)) {
                console.log(`Skipping regular price line: ${line}`);
                continue;
            }

            // Skip tax calculation lines
            if (line.match(/^t\s*=\s*ia\s+tax/i) || line.match(/^\d+\.\d+\s*on\s*\$?\d+\.\d{2}/i)) {
                console.log(`Skipping tax calculation: ${line}`);
                continue;
            }

            // Skip lines that are just whitespace or tax codes
            if (line.match(/^\s*$/i) || line.match(/^[nft]\s*$/i)) {
                console.log(`Skipping tax code or whitespace: ${line}`);
                continue;
            }

            // ============ ENHANCED DISCOUNT FILTERING ============
            // Skip discount lines (negative amounts or percentage-based)
            if (line.match(/^\d+%.*\(\$\d+\.\d{2}\)$/i)) {
                console.log(`Skipping discount line: ${line}`);
                continue;
            }

            // Skip lines that contain discount codes with percentages
            if (line.match(/^\d+.*\d+%.*\(\$\d+\.\d{2}\)$/i)) {
                console.log(`Skipping discount code line: ${line}`);
                continue;
            }

            // Skip measurement calculation lines
            if (line.match(/^\d+\.?\d*\s*x\s*\$\d+\.\d{2}$/i)) {
                console.log(`Skipping measurement line: ${line}`);
                continue;
            }

            // Skip lines that are just weights/measurements
            if (line.match(/^\d+\.?\d*x?$/i) && line.length < 5) {
                console.log(`Skipping weight line: ${line}`);
                continue;
            }

            // Skip specific total lines (case insensitive)
            if (line.match(/^(sub-total|sub total|subtotal|net amount|netamount|total|amount)$/i)) {
                console.log(`Skipping total line: ${line}`);
                continue;
            }

            // ============ ENHANCED NEGATIVE AMOUNT DETECTION ============
            // Check for negative amounts in various formats
            const negativeAmountPatterns = [
                /^.*-\$?\d+\.\d{2}$/i,        // Ends with negative amount
                /^.*\s+-\$?\d+\.\d{2}$/i,     // Space before negative amount
                /^.*\s+\$?-\d+\.\d{2}$/i,     // Dollar sign before negative
            ];

            // Check if line contains a price
            const priceMatch = line.match(pricePattern);
            if (priceMatch) {
                const price = parseFloat(priceMatch[1]);

                // Skip very high prices that are likely totals (over $100)
                if (price > 100) {
                    console.log(`Skipping high price line (likely total): ${line}`);
                    continue;
                }

                // Skip negative amounts
                if (negativeAmountPatterns.some(pattern => pattern.test(line))) {
                    console.log(`Skipping negative amount line: ${line}`);
                    continue;
                }

                // ============ ENHANCED TARGET ITEM PROCESSING ============
                let nameMatch = line;
                let itemPrice = price;
                let quantity = 1;
                let unitPrice = price;

                // Check if next line contains quantity information
                if (nextLine && nextLine.match(/^\d+\s*@\s*\$?\d+\.\d{2}\s*ea$/i)) {
                    const qtyMatch = nextLine.match(/(\d+)\s*@\s*\$?(\d+\.\d{2})\s*ea$/i);
                    if (qtyMatch) {
                        quantity = parseInt(qtyMatch[1]);
                        unitPrice = parseFloat(qtyMatch[2]);
                        itemPrice = quantity * unitPrice;
                        console.log(`Found quantity info in next line: ${quantity} @ $${unitPrice}`);
                    }
                }

                // Check if current line contains embedded quantity information
                const embeddedQtyMatch = line.match(/^(.*?)\s+(\d+)\s*@\s*\$?(\d+\.\d{2})\s*ea/i);
                if (embeddedQtyMatch) {
                    nameMatch = embeddedQtyMatch[1];
                    quantity = parseInt(embeddedQtyMatch[2]);
                    unitPrice = parseFloat(embeddedQtyMatch[3]);
                    itemPrice = quantity * unitPrice;
                } else {
                    // Remove price from name
                    nameMatch = line.replace(pricePattern, '').trim();
                }

                // Clean up the item name
                nameMatch = cleanItemName(nameMatch);

                // Enhanced ground beef detection and cleaning
                // Convert "80% 20% FT GRD BF" to "80/20 Ground Beef"
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

                // Check for quantity pattern
                const qtyMatch = line.match(quantityPattern);

                // Only process if we have a meaningful item name (more than 2 characters, not just numbers)
                if (nameMatch && nameMatch.length > 2 && !nameMatch.match(/^\d+\.?\d*$/) && !nameMatch.match(/^[tx]\s*\d/i)) {
                    console.log(`Processing item: ${nameMatch} - Qty: ${quantity} @ $${unitPrice} = $${itemPrice}`);
                    const item = {
                        id: Date.now() + Math.random(),
                        name: nameMatch,
                        price: itemPrice,
                        quantity: quantity,
                        unitPrice: unitPrice,
                        upc: upcMatch ? upcMatch[0] : '',
                        category: guessCategory(nameMatch),
                        location: guessLocation(nameMatch),
                        rawText: line + (nextLine && nextLine.match(/^\d+\s*@.*ea$/i) ? ` + ${nextLine}` : ''),
                        selected: true, // Selected by default
                        needsReview: false
                    };

                    items.push(item);
                } else {
                    console.log(`Skipping line with insufficient name: ${line}`);
                }
            }
        }

        // Combine duplicate items based on UPC code
        return combineDuplicateItems(items);
    }

// Combine items with the same UPC code or identical names
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

    /// Enhanced cleanItemName function with support for all stores
    function cleanItemName(name) {
        // Remove UPC codes at the beginning (Target and others put them first)
        name = name.replace(/^\d{8,}\s+/, '');

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

// Guess category based on item name
    function guessCategory(name) {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('milk') || nameLower.includes('cheese') || nameLower.includes('yogurt')) {
            return 'Dairy';
        }
        if (nameLower.includes('bread') || nameLower.includes('bagel') || nameLower.includes('rolls')) {
            return 'Breads';
        }
        if (nameLower.includes('apple') || nameLower.includes('banana') || nameLower.includes('orange')) {
            return 'Fresh Fruits';
        }
        if (nameLower.includes('lettuce') || nameLower.includes('tomato') || nameLower.includes('carrot')) {
            return 'Fresh Vegetables';
        }
        if (nameLower.includes('chicken') || nameLower.includes('beef') || nameLower.includes('pork')) {
            return 'Fresh/Frozen Poultry';
        }
        if (nameLower.includes('cereal') || nameLower.includes('oats') || nameLower.includes('rice')) {
            return 'Grains';
        }
        if (nameLower.includes('pasta') || nameLower.includes('noodle') || nameLower.includes('spaghetti')) {
            return 'Pasta';
        }
        if (nameLower.includes('soup') || nameLower.includes('can') || nameLower.includes('sauce')) {
            return 'Canned Meals';
        }
        // Enhanced categories for Target items
        if (nameLower.includes('birds eye') || nameLower.includes('frozen vegetable')) {
            return 'Frozen Vegetables';
        }
        if (nameLower.includes('frosty paws') || nameLower.includes('ice cream') || nameLower.includes('frozen treat')) {
            return 'Frozen Fruit'; // or could be 'Frozen Desserts' if you have that category
        }

        return 'Other';
    }

// UPDATED: Guess storage location with kitchen cabinets option
    function guessLocation(name) {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('frozen') || nameLower.includes('ice cream') || nameLower.includes('frosty paws')) {
            return 'freezer';
        }
        if (nameLower.includes('milk') || nameLower.includes('yogurt') || nameLower.includes('cheese')) {
            return 'fridge';
        }
        // ADDED: Kitchen cabinets for spices, seasonings, and cooking essentials
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

// Update item in the list
    function updateItem(itemId, field, value) {
        setExtractedItems(prev => prev.map(item =>
            item.id === itemId ? {...item, [field]: value} : item
        ));
    }

// Toggle item selection
    function toggleItemSelection(itemId) {
        setExtractedItems(prev => prev.map(item =>
            item.id === itemId ? {...item, selected: !item.selected} : item
        ));
    }

// Calculate UPC check digit using standard algorithm
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

// Lookup item by UPC with intelligent check digit calculation
    async function lookupByUPC(item) {
        if (!item.upc) return;

        // Function to try UPC lookup with a specific code
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
                        expirationDate: null // User can set this later
                    })
                })
            );

            await Promise.all(promises);

            setProcessingStatus('Complete!');

            // Show success message
            alert(`✅ Successfully added ${selectedItems.length} items to your inventory!`);

            // Redirect to inventory page
            router.push('/inventory');

        } catch (error) {
            console.error('Error adding items:', error);
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

// FIXED: Handle report modal file uploads (renamed to avoid conflict)
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

            // If there's a receipt image, include it
            if (reportData.receiptImage) {
                // Convert image URL to blob
                const response = await fetch(reportData.receiptImage);
                const blob = await response.blob();
                formData.append('receiptImage', blob, 'receipt.jpg');
            }

            // Add additional files
            reportData.additionalFiles.forEach((file, index) => {
                formData.append(`additionalFile_${index}`, file, file.name);
            });

            const response = await fetch('/api/receipt-issue-report', {
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
                                    {/* Camera Option */}
                                    <TouchEnhancedButton
                                        onClick={startCamera}
                                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                    >
                                        <div className="text-4xl mb-2">📷</div>
                                        <div className="text-lg font-medium text-indigo-700">Take Photo</div>
                                        <div className="text-sm text-gray-500">Use device camera</div>
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

                                {/* Error display */}
                                {cameraError && (
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
                                    <h4 className="text-sm font-medium text-blue-900 mb-2">📝 Tips for Best
                                        Results:</h4>
                                    <ul className="text-sm text-blue-800 space-y-1">
                                        <li>• Ensure receipt is flat and well-lit</li>
                                        <li>• Avoid shadows and glare</li>
                                        <li>• Include the entire receipt in the frame</li>
                                        <li>• Higher resolution images work better</li>
                                    </ul>
                                </div>

                                {/* Report Issue Section */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-yellow-900 mb-2">🐛 Having Issues?</h4>
                                    <p className="text-sm text-yellow-800 mb-3">
                                        If the receipt scanner isn't working properly with your receipt, you can
                                        report
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

                        {/* Camera View - Simplified */}
                        {showCamera && (
                            <div className="space-y-4">
                                <div className="text-center">
                                    <h3 className="text-lg font-medium mb-4">📷 Camera View</h3>
                                </div>

                                <div className="relative bg-black rounded-lg overflow-hidden">
                                    {/* Simple video container */}
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

                                    {/* Simple overlay */}
                                    <div
                                        className="absolute inset-4 border-2 border-white border-dashed rounded-lg pointer-events-none">
                                        <div
                                            className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                            📱 Position receipt here
                                        </div>
                                        <div
                                            className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                            📱 Keep receipt flat and well-lit
                                        </div>
                                        <div
                                            className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                            📏 Fill frame completely
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

                                {/* Simple debug for camera view */}
                                <div className="text-xs text-center bg-gray-100 p-2 rounded text-gray-600">
                                    Camera: {videoRef.current?.videoWidth || 0} x {videoRef.current?.videoHeight || 0}
                                </div>
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
                                            clearer
                                            image.
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
                                                                <option value="Other">Other</option>
                                                                <option value="Fresh Vegetables">Fresh Vegetables
                                                                </option>
                                                                <option value="Fresh Fruits">Fresh Fruits</option>
                                                                <option value="Fresh Spices">Fresh Spices</option>
                                                                <option value="Dairy">Dairy</option>
                                                                <option value="Cheese">Cheese</option>
                                                                <option value="Eggs">Eggs</option>
                                                                <option value="Fresh/Frozen Poultry">Fresh/Frozen
                                                                    Poultry
                                                                </option>
                                                                <option value="Fresh/Frozen Beef">Fresh/Frozen Beef
                                                                </option>
                                                                <option value="Fresh/Frozen Pork">Fresh/Frozen Pork
                                                                </option>
                                                                <option value="Fresh/Frozen Lamb">Fresh/Frozen Lamb
                                                                </option>
                                                                <option value="Fresh/Frozen Rabbit">Fresh/Frozen
                                                                    Rabbit
                                                                </option>
                                                                <option value="Fresh/Frozen Venison">Fresh/Frozen
                                                                    Venison
                                                                </option>
                                                                <option
                                                                    value="Fresh/Frozen Fish & Seafood">Fresh/Frozen
                                                                    Fish & Seafood
                                                                </option>
                                                                <option value="Beans">Beans</option>
                                                                <option value="Canned Meat">Canned/Jarred Meat
                                                                </option>
                                                                <option value="Canned Vegetables">Canned/Jarred
                                                                    Vegetables
                                                                </option>
                                                                <option value="Canned Fruit">Canned/Jarred Fruit
                                                                </option>
                                                                <option value="Canned Sauces">Canned/Jarred Sauces
                                                                </option>
                                                                <option value="Canned Tomatoes">Canned/Jarred
                                                                    Tomatoes
                                                                </option>
                                                                <option value="Canned Beans">Canned/Jarred Beans
                                                                </option>
                                                                <option value="Canned Meals">Canned/Jarred Meals
                                                                </option>
                                                                <option value="Frozen Vegetables">Frozen Vegetables
                                                                </option>
                                                                <option value="Frozen Fruit">Frozen Fruit</option>
                                                                <option value="Grains">Grains</option>
                                                                <option value="Breads">Breads</option>
                                                                <option value="Pasta">Pasta</option>
                                                                <option value="Stuffing & Sides">Stuffing & Sides
                                                                </option>
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

                                                    {/* UPC Lookup Button - Only show if UPC exists and API is available */}
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
