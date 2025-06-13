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
    const [debugLog, setDebugLog] = useState([]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                console.log('🧹 Cleaning up camera stream on unmount');
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

    // Add debug logging function
    function addDebugLog(message) {
        console.log(message);
        setDebugLog(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
    }

    // Simple camera start function
    async function startCamera() {
        addDebugLog('🔥 Take Photo button clicked!');
        addDebugLog('🎥 startCamera function called');
        setCameraError(null);

        try {
            addDebugLog('📱 Checking for navigator.mediaDevices...');
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported');
            }
            addDebugLog('✅ Camera API is supported');

            // Stop any existing stream
            if (streamRef.current) {
                addDebugLog('🛑 Stopping existing stream');
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            addDebugLog('📞 Calling getUserMedia...');
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            addDebugLog('✅ Got camera stream');
            streamRef.current = stream;

            // Wait for video element
            if (!videoRef.current) {
                addDebugLog('❌ No video element');
                setCameraError('Video element not found');
                return;
            }
            addDebugLog('✅ Video element found');

            addDebugLog('📺 Setting video srcObject...');
            // Set video source
            videoRef.current.srcObject = stream;

            addDebugLog('⏳ Waiting for video to load...');
            // Wait for video to load
            await new Promise((resolve, reject) => {
                const video = videoRef.current;

                const onLoadedMetadata = () => {
                    addDebugLog(`📺 Video loaded: ${video.videoWidth} x ${video.videoHeight}`);
                    video.removeEventListener('loadedmetadata', onLoadedMetadata);
                    resolve();
                };

                const onError = (e) => {
                    addDebugLog('❌ Video error: ' + e.message);
                    video.removeEventListener('error', onError);
                    reject(e);
                };

                video.addEventListener('loadedmetadata', onLoadedMetadata);
                video.addEventListener('error', onError);

                addDebugLog('🎬 Attempting to play video...');
                // Force play
                video.play()
                    .then(() => addDebugLog('✅ Video play succeeded'))
                    .catch(e => addDebugLog('⚠️ Video play failed: ' + e.message));
            });

            addDebugLog('🎉 Setting showCamera to true');
            setShowCamera(true);
            addDebugLog('✅ Camera started successfully');

        } catch (error) {
            addDebugLog('❌ Camera error: ' + error.message);
            setCameraError('Failed to start camera: ' + error.message);
        }
    }

    // Simple camera stop function
    function stopCamera() {
        console.log('🛑 Stopping camera...');

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

    // Lookup item by UPC
    async function lookupByUPC(item) {
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
        console.log('🔄 Resetting scan state...');

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

        console.log('✅ Scan state reset complete');
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

                                {/* Visible Debug Log */}
                                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-40 overflow-y-auto">
                                    <div className="font-semibold mb-2 text-green-300">📱 Real-time Debug Log:</div>
                                    {debugLog.length === 0 ? (
                                        <div className="text-gray-500">Waiting for actions...</div>
                                    ) : (
                                        debugLog.map((log, index) => (
                                            <div key={index} className="mb-1">{log}</div>
                                        ))
                                    )}
                                </div>

                                {/* Error display */}
                                {cameraError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="text-red-700">❌ {cameraError}</div>
                                    </div>
                                )}

                                {/* Simple debug info */}
                                <div className="text-xs text-gray-400 text-center space-y-1 bg-gray-50 p-4 rounded-lg">
                                    <div className="font-semibold mb-2">🔧 Debug Info:</div>
                                    <div>Video ref: {videoRef.current ? '✅ Available' : '❌ Not available'}</div>
                                    <div>Canvas ref: {canvasRef.current ? '✅ Available' : '❌ Not available'}</div>
                                    <div>Camera stream: {streamRef.current ? '✅ Active' : '❌ Inactive'}</div>
                                    <div>Show camera: {showCamera ? '✅ True' : '❌ False'}</div>
                                    <div>Step: {step}</div>
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
                                <div className="text-xs text-center bg-gray-100 p-2 rounded">
                                    Video: {videoRef.current?.videoWidth || 0} x {videoRef.current?.videoHeight || 0} |
                                    Ready: {videoRef.current?.readyState || 0} |
                                    Stream: {streamRef.current ? 'Active' : 'None'}
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

                {/* Hidden canvas for photo capture - Always rendered */}
                <canvas ref={canvasRef} className="hidden" />

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}