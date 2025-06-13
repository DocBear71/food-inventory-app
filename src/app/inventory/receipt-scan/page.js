// file: /src/app/inventory/receipt-scan/page.js - v3 Receipt scanning with OCR - Simplified camera approach

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

export default function ReceiptScan() {
    const { data: session, status } = useSession();
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

    // Simple camera start function
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

            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

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

            // Wait for video to load
            await new Promise((resolve, reject) => {
                const video = videoRef.current;

                const onLoadedMetadata = () => {
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    resolve();
                };

                const onError = (e) => {
                    video.removeEventListener('error', onError);
                    reject(e);
                };

                video.addEventListener('loadedmetadata', onLoadedMetadata);
                video.addEventListener('error', onError);

                // Force play
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

    // Capture photo function
    function capturePhoto() {
        if (!videoRef.current || !canvasRef.current || !streamRef.current) {
            alert('Camera not ready');
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0);

        // Convert to blob and process
        canvas.toBlob((blob) => {
            if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                setCapturedImage(imageUrl);
                stopCamera();
                processImage(blob);
            }
        }, 'image/jpeg', 0.9);
    }

    // Handle file upload
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            setCapturedImage(imageUrl);
            processImage(file);
        } else {
            alert('Please select a valid image file.');
        }
    }

    // Process image with OCR
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

            const { data: { text } } = await Tesseract.recognize(
                imageFile,
                'eng',
                {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            setOcrProgress(progress);
                            setProcessingStatus(`Extracting text... ${progress}%`);
                        }
                    }
                }
            );

            setProcessingStatus('Analyzing receipt...');

            // Parse extracted text into items
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

    // Parse receipt text into structured items
    function parseReceiptText(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const items = [];

        // Common patterns for receipt items
        const pricePattern = /\$?(\d+\.\d{2})/;
        const upcPattern = /\b\d{12,14}\b/;
        const quantityPattern = /(\d+)\s*@\s*\$?(\d+\.\d{2})/;

        // Skip header/footer lines (store name, totals, etc.)
        const skipPatterns = [
            /^(walmart|target|kroger|publix|safeway|hy-vee|hyvee)/i,
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
            /^[\d\s]{15,}$/
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Skip common header/footer patterns
            if (skipPatterns.some(pattern => pattern.test(line))) {
                continue;
            }

            // Check if line contains a price
            const priceMatch = line.match(pricePattern);
            if (priceMatch) {
                const price = parseFloat(priceMatch[1]);

                // Extract item name (everything before the price)
                const nameMatch = line.replace(pricePattern, '').trim();

                // Check for UPC in current or nearby lines
                const upcMatch = line.match(upcPattern) ||
                    (i > 0 ? lines[i-1].match(upcPattern) : null) ||
                    (i < lines.length - 1 ? lines[i+1].match(upcPattern) : null);

                // Check for quantity pattern
                const qtyMatch = line.match(quantityPattern);

                if (nameMatch && nameMatch.length > 2) {
                    const item = {
                        id: Date.now() + Math.random(),
                        name: cleanItemName(nameMatch),
                        price: price,
                        quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
                        unitPrice: qtyMatch ? parseFloat(qtyMatch[2]) : price,
                        upc: upcMatch ? upcMatch[0] : '',
                        category: guessCategory(nameMatch),
                        location: guessLocation(nameMatch),
                        rawText: line,
                        selected: true, // Selected by default
                        needsReview: false
                    };

                    items.push(item);
                }
            }
        }

        // Combine duplicate items based on UPC code
        return combineDuplicateItems(items);
    }

    // Combine items with the same UPC code
    function combineDuplicateItems(items) {
        const upcGroups = {};
        const nonUpcItems = [];

        // Group items by UPC code
        items.forEach(item => {
            if (item.upc && item.upc.length >= 11) {
                // Clean UPC for consistent matching
                const cleanUPC = item.upc.replace(/\D/g, '');

                if (!upcGroups[cleanUPC]) {
                    upcGroups[cleanUPC] = [];
                }
                upcGroups[cleanUPC].push(item);
            } else {
                // Items without UPC codes are kept separate
                nonUpcItems.push(item);
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
                    rawText: `${group.length} identical items combined: ${firstItem.rawText}`,
                    id: Date.now() + Math.random() // New ID for combined item
                };

                combinedItems.push(combinedItem);

                console.log(`Combined ${group.length} items with UPC ${firstItem.upc}: ${firstItem.name} (Total qty: ${totalQuantity})`);
            }
        });

        // Add non-UPC items as-is
        combinedItems.push(...nonUpcItems);

        return combinedItems;
    }

    // Clean up item names
    function cleanItemName(name) {
        return name
            .replace(/[^\w\s\-&']/g, ' ') // Remove special chars except common ones
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .split(' ')
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

        return 'Other';
    }

    // Guess storage location
    function guessLocation(name) {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('frozen') || nameLower.includes('ice cream')) {
            return 'freezer';
        }
        if (nameLower.includes('milk') || nameLower.includes('yogurt') || nameLower.includes('cheese')) {
            return 'fridge';
        }

        return 'pantry';
    }

    // Update item in the list
    function updateItem(itemId, field, value) {
        setExtractedItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, [field]: value } : item
        ));
    }

    // Toggle item selection
    function toggleItemSelection(itemId) {
        setExtractedItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, selected: !item.selected } : item
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
                    headers: { 'Content-Type': 'application/json' },
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

    // Reset to start over
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
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />

                                {/* Error display */}
                                {cameraError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="text-red-700">❌ {cameraError}</div>
                                        <div className="text-sm text-red-600 mt-2">
                                            Please try using the upload option instead, or check your camera permissions.
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
                                    </ul>
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
                                    <div className="absolute inset-4 border-2 border-white border-dashed rounded-lg pointer-events-none">
                                        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                            📱 Position receipt here
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

                        {/* Rest of the component remains the same... */}
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
                                        style={{ width: `${ocrProgress}%` }}
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

                                                        {/* Quantity & Location */}
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
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hidden canvas for photo capture - Always rendered */}
                <canvas ref={canvasRef} className="hidden" />

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}