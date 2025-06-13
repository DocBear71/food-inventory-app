// file: /src/app/inventory/receipt-scan/page.js - v1 Receipt scanning with OCR

'use client';

import { useState, useRef, useCallback } from 'react';
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

    // State management
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [capturedImage, setCapturedImage] = useState(null);
    const [extractedItems, setExtractedItems] = useState([]);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [step, setStep] = useState('upload'); // 'upload', 'processing', 'review', 'adding'
    const [processingStatus, setProcessingStatus] = useState('');

    // Redirect if not authenticated
    if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return null;
    }

    // Loading state
    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-lg">Loading...</div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // Initialize camera with enhanced error handling and proper video setup
    const startCamera = async () => {
        try {
            console.log('🎥 Starting camera initialization...');

            // Check if browser supports camera
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported in this browser');
            }

            // Check if video element exists
            if (!videoRef.current) {
                console.error('❌ Video element not found');
                throw new Error('Video element not available');
            }

            console.log('🎥 Video element found, requesting camera permissions...');

            // Request camera access with fallback constraints
            let stream;

            try {
                // Try with environment camera first (back camera on mobile)
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920, max: 1920 },
                        height: { ideal: 1080, max: 1080 }
                    }
                });
                console.log('✅ Environment camera access granted');
            } catch (envError) {
                console.log('⚠️ Environment camera failed, trying any camera:', envError.message);

                try {
                    // Fallback to any available camera
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1280, max: 1920 },
                            height: { ideal: 720, max: 1080 }
                        }
                    });
                    console.log('✅ Any camera access granted');
                } catch (anyError) {
                    console.log('⚠️ Any camera failed, trying basic constraints:', anyError.message);

                    // Last resort - basic video constraint
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: true
                    });
                    console.log('✅ Basic camera access granted');
                }
            }

            if (!stream) {
                throw new Error('Failed to get camera stream');
            }

            console.log('🎥 Camera stream obtained, setting up video element...');

            // Store stream first
            setCameraStream(stream);

            // Set up video element
            const video = videoRef.current;
            video.srcObject = stream;

            // Wait for video to be ready before showing camera
            const handleVideoReady = () => {
                console.log('✅ Video ready, showing camera interface');
                console.log('📏 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
                setShowCamera(true);

                // Remove event listeners
                video.removeEventListener('loadedmetadata', handleVideoReady);
                video.removeEventListener('canplay', handleVideoReady);
            };

            // Listen for video ready events
            video.addEventListener('loadedmetadata', handleVideoReady);
            video.addEventListener('canplay', handleVideoReady);

            // Fallback timeout in case events don't fire
            setTimeout(() => {
                if (!showCamera && stream.active) {
                    console.log('⏰ Timeout reached, showing camera anyway');
                    setShowCamera(true);
                }
            }, 3000);

            console.log('✅ Camera setup completed');

        } catch (error) {
            console.error('❌ Camera access error:', error);

            let errorMessage = 'Unable to access camera. ';

            if (error.name === 'NotAllowedError') {
                errorMessage += 'Camera permission was denied. Please allow camera access in your browser settings and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No camera was found on this device.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage += 'Camera is not supported by this browser.';
            } else if (error.name === 'NotReadableError') {
                errorMessage += 'Camera is already being used by another application.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage += 'Camera constraints could not be satisfied.';
            } else {
                errorMessage += error.message || 'Unknown camera error occurred.';
            }

            alert(errorMessage + '\n\nPlease use the file upload option instead.');
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
    };

    // Capture photo from camera with enhanced error handling
    const capturePhoto = () => {
        console.log('📸 Attempting to capture photo...');

        if (!videoRef.current || !canvasRef.current) {
            console.error('❌ Video or canvas ref not available');
            alert('Camera capture failed. Video or canvas not ready.');
            return;
        }

        if (!cameraStream) {
            console.error('❌ No camera stream available');
            alert('No camera stream available. Please restart the camera.');
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Check if video is ready
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.error('❌ Video not ready for capture');
            alert('Camera is not ready yet. Please wait a moment and try again.');
            return;
        }

        console.log('📏 Capturing from video dimensions:', video.videoWidth, 'x', video.videoHeight);

        try {
            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw video frame to canvas
            context.drawImage(video, 0, 0);

            // Convert to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    console.log('✅ Photo captured successfully, blob size:', blob.size);
                    const imageUrl = URL.createObjectURL(blob);
                    setCapturedImage(imageUrl);
                    stopCamera();
                    processImage(blob);
                } else {
                    console.error('❌ Failed to create blob from canvas');
                    alert('Failed to capture photo. Please try again.');
                }
            }, 'image/jpeg', 0.9); // Higher quality

        } catch (error) {
            console.error('❌ Error during photo capture:', error);
            alert('Error capturing photo: ' + error.message);
        }
    };

    // Handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            setCapturedImage(imageUrl);
            processImage(file);
        } else {
            alert('Please select a valid image file.');
        }
    };

    // Process image with OCR
    const processImage = async (imageFile) => {
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
    };

    // Parse receipt text into structured items
    const parseReceiptText = (text) => {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const items = [];
        let currentItem = null;

        // Common patterns for receipt items
        const pricePattern = /\$?(\d+\.\d{2})/;
        const upcPattern = /\b\d{12,14}\b/;
        const quantityPattern = /(\d+)\s*@\s*\$?(\d+\.\d{2})/;

        // Skip header/footer lines (store name, totals, etc.)
        const skipPatterns = [
            /^(walmart|target|kroger|publix|safeway)/i,
            /^(total|subtotal|tax|change|card|cash)/i,
            /^(thank you|receipt|store|phone|address)/i,
            /^\d{2}\/\d{2}\/\d{4}/,
            /^[\d\s\-\(\)]+$/
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

        return items;
    };

    // Clean up item names
    const cleanItemName = (name) => {
        return name
            .replace(/[^\w\s\-&']/g, ' ') // Remove special chars except common ones
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    // Guess category based on item name
    const guessCategory = (name) => {
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
    };

    // Guess storage location
    const guessLocation = (name) => {
        const nameLower = name.toLowerCase();

        if (nameLower.includes('frozen') || nameLower.includes('ice cream')) {
            return 'freezer';
        }
        if (nameLower.includes('milk') || nameLower.includes('yogurt') || nameLower.includes('cheese')) {
            return 'fridge';
        }

        return 'pantry';
    };

    // Update item in the list
    const updateItem = (itemId, field, value) => {
        setExtractedItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, [field]: value } : item
        ));
    };

    // Toggle item selection
    const toggleItemSelection = (itemId) => {
        setExtractedItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, selected: !item.selected } : item
        ));
    };

    // Lookup item by UPC
    const lookupByUPC = async (item) => {
        if (!item.upc) return;

        try {
            const response = await fetch(`/api/upc/lookup?upc=${item.upc}`);
            const data = await response.json();

            if (data.success && data.product.found) {
                updateItem(item.id, 'name', data.product.name);
                updateItem(item.id, 'category', data.product.category);
                updateItem(item.id, 'brand', data.product.brand);
                updateItem(item.id, 'needsReview', false);
            }
        } catch (error) {
            console.error('UPC lookup error:', error);
        }
    };

    // Add selected items to inventory
    const addItemsToInventory = async () => {
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
    };

    // Reset to start over
    const resetScan = () => {
        setStep('upload');
        setCapturedImage(null);
        setExtractedItems([]);
        setIsProcessing(false);
        setOcrProgress(0);
        setProcessingStatus('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

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

                                {/* Debug info for troubleshooting */}
                                <div className="text-xs text-gray-400 text-center space-y-1">
                                    <div>🔧 Debug Info:</div>
                                    <div>Video ref: {videoRef.current ? '✅ Available' : '❌ Not available'}</div>
                                    <div>Canvas ref: {canvasRef.current ? '✅ Available' : '❌ Not available'}</div>
                                    <div>Camera stream: {cameraStream ? '✅ Active' : '❌ Inactive'}</div>
                                    <div>Show camera: {showCamera ? '✅ True' : '❌ False'}</div>
                                </div>

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

                        {/* Camera View */}
                        {showCamera && (
                            <div className="space-y-4">
                                <div className="relative bg-black rounded-lg overflow-hidden">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-64 md:h-96 object-cover"
                                        onLoadedMetadata={() => {
                                            console.log('📱 Video loaded, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
                                        }}
                                        onError={(e) => {
                                            console.error('Video error:', e);
                                            alert('Video playback error. Please try again or use file upload.');
                                            stopCamera();
                                        }}
                                    />
                                    <div className="absolute inset-0 border-2 border-white border-dashed opacity-50 m-4 rounded-lg"></div>

                                    {/* Camera status indicator */}
                                    <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                        {cameraStream ? '🟢 Camera Active' : '🔴 Camera Inactive'}
                                    </div>
                                </div>

                                <div className="flex justify-center space-x-4">
                                    <TouchEnhancedButton
                                        onClick={capturePhoto}
                                        disabled={!cameraStream}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:bg-gray-400"
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

                                {/* Debug info */}
                                <div className="text-xs text-gray-500 text-center">
                                    {videoRef.current && (
                                        <div>
                                            Video: {videoRef.current.videoWidth || 0} x {videoRef.current.videoHeight || 0}
                                        </div>
                                    )}
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
                                                                <option value="Dairy">Dairy</option>
                                                                <option value="Fresh/Frozen Poultry">Fresh/Frozen Poultry</option>
                                                                <option value="Fresh/Frozen Beef">Fresh/Frozen Beef</option>
                                                                <option value="Grains">Grains</option>
                                                                <option value="Pasta">Pasta</option>
                                                                <option value="Canned Meals">Canned Meals</option>
                                                                <option value="Beverages">Beverages</option>
                                                                <option value="Snacks">Snacks</option>
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

                                                    {/* UPC Lookup Button */}
                                                    {item.upc && (
                                                        <TouchEnhancedButton
                                                            onClick={() => lookupByUPC(item)}
                                                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                                            title="Lookup product details by UPC"
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

                {/* Hidden canvas for photo capture */}
                <canvas ref={canvasRef} className="hidden" />

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}