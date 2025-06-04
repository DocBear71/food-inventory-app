// file: /src/components/inventory/BarcodeScanner.js

'use client';

import { useState } from 'react';
import BarcodeScanner from './BarcodeScanner';

// Helper function for Nutri-Score colors
function getNutriScoreColor(score) {
    const colors = {
        'a': '#038c3e',
        'b': '#85bb2f',
        'c': '#f9c000',
        'd': '#f79100',
        'e': '#e63312'
    };
    return colors[score.toLowerCase()] || '#gray';
}

export default function UPCLookup({ onProductFound, onUPCChange, currentUPC = '' }) {
    const [isLooking, setIsLooking] = useState(false);
    const [lookupResult, setLookupResult] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [cameraAvailable, setCameraAvailable] = useState(true);

    // Check if camera is available
    const checkCameraAvailability = () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraAvailable(false);
            return false;
        }
        return true;
    };

    const handleScannerClick = () => {
        if (!checkCameraAvailability()) {
            alert('Camera not available on this device. Please enter UPC manually.');
            return;
        }
        setShowScanner(true);
    };

    const handleUPCLookup = async (upc) => {
        if (!upc || upc.length < 8) return;

        setIsLooking(true);
        setLookupResult(null);

        try {
            const response = await fetch(`/api/upc/lookup?upc=${encodeURIComponent(upc)}`);
            const data = await response.json();

            if (data.success && data.product.found) {
                setLookupResult({ success: true, product: data.product });
                onProductFound(data.product);
            } else {
                setLookupResult({
                    success: false,
                    message: data.message || 'Product not found'
                });
            }
        } catch (error) {
            console.error('UPC lookup error:', error);
            setLookupResult({
                success: false,
                message: 'Error looking up product'
            });
        } finally {
            setIsLooking(false);
        }
    };

    const handleUPCInput = (e) => {
        const upc = e.target.value;
        onUPCChange(upc);

        // Auto-lookup when UPC looks complete
        if (upc.length >= 12 && upc.length <= 14) {
            handleUPCLookup(upc);
        }
    };

    const handleManualLookup = () => {
        if (currentUPC) {
            handleUPCLookup(currentUPC);
        }
    };

    const handleBarcodeDetected = (barcode) => {
        console.log('Barcode scanned:', barcode);

        // Clear any existing lookup result
        setLookupResult(null);

        // Update UPC field
        onUPCChange(barcode);

        // Close scanner
        setShowScanner(false);

        // Add small delay before lookup to ensure state is updated
        setTimeout(() => {
            handleUPCLookup(barcode);
        }, 300);
    };

    const handleScannerClose = () => {
        setShowScanner(false);
    };

    return (
        <div className="space-y-4">
            {/* UPC Input Section */}
            <div>
                <label htmlFor="upc" className="block text-sm font-medium text-gray-700 mb-2">
                    UPC/Barcode
                </label>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        id="upc"
                        name="upc"
                        value={currentUPC}
                        onChange={handleUPCInput}
                        placeholder="Enter or scan UPC code"
                        className="flex-1 mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <button
                        type="button"
                        onClick={handleScannerClick}
                        disabled={isLooking}
                        className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 ${
                            cameraAvailable ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 cursor-not-allowed'
                        }`}
                        title={cameraAvailable ? 'Scan barcode with camera' : 'Camera not available on this device'}
                    >
                        📷 {cameraAvailable ? 'Scan' : 'No Camera'}
                    </button>
                    <button
                        type="button"
                        onClick={handleManualLookup}
                        disabled={!currentUPC || isLooking}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
                    >
                        {isLooking ? '🔍' : '🔍'} Lookup
                    </button>
                </div>
            </div>

            {/* Scanner Section */}
            <BarcodeScanner
                isActive={showScanner}
                onBarcodeDetected={handleBarcodeDetected}
                onClose={handleScannerClose}
            />

            {/* Loading State */}
            {isLooking && (
                <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-blue-700">Looking up product...</span>
                </div>
            )}

            {/* Lookup Results */}
            {lookupResult && (
                <div className={`p-4 rounded-lg ${
                    lookupResult.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                    {lookupResult.success ? (
                        <div>
                            <div className="flex items-center mb-3">
                                <span className="text-green-600 font-medium">✅ Product Found in Open Food Facts!</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 text-sm">
                                    <div><strong>Name:</strong> {lookupResult.product.name}</div>
                                    {lookupResult.product.brand && (
                                        <div><strong>Brand:</strong> {lookupResult.product.brand}</div>
                                    )}
                                    <div><strong>Category:</strong> {lookupResult.product.category}</div>
                                    {lookupResult.product.quantity && (
                                        <div><strong>Size:</strong> {lookupResult.product.quantity}</div>
                                    )}
                                    {lookupResult.product.scores && lookupResult.product.scores.nutriscore && (
                                        <div><strong>Nutri-Score:</strong>
                                            <span className="ml-1 px-2 py-1 text-xs font-bold text-white rounded"
                                                  style={{backgroundColor: getNutriScoreColor(lookupResult.product.scores.nutriscore)}}>
                        {lookupResult.product.scores.nutriscore.toUpperCase()}
                      </span>
                                        </div>
                                    )}
                                </div>
                                {lookupResult.product.image && (
                                    <div className="flex justify-center">
                                        <img
                                            src={lookupResult.product.image}
                                            alt={lookupResult.product.name}
                                            className="w-24 h-24 object-cover rounded-lg shadow-sm"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="mt-3 text-xs text-gray-500">
                                <a
                                    href={lookupResult.product.openFoodFactsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    View on Open Food Facts →
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center mb-2">
                                <span className="text-yellow-600 font-medium">⚠️ {lookupResult.message}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                                You can still add this item manually by filling out the form below, or try a different UPC code.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Usage Tips */}
            <div className="text-xs text-gray-500 space-y-1">
                <div>💡 <strong>Tips:</strong></div>
                <div>• UPC codes are usually 12-14 digits long</div>
                <div>• Camera scanning works best in good lighting</div>
                <div>• Hold your device steady when scanning</div>
                <div>• Data comes from Open Food Facts community database</div>
                <div>• If not found, you can still add the item manually</div>
            </div>
        </div>
    );
}