// file: /src/components/inventory/UPCLookup.js - v4

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

// NEW: Helper function to convert your API nutrition format to standardized format
function standardizeNutritionData(nutrition) {
    if (!nutrition) return null;

    return {
        calories: {
            value: nutrition.energy_100g || 0,
            unit: 'kcal',
            name: 'Calories'
        },
        protein: {
            value: nutrition.proteins_100g || 0,
            unit: 'g',
            name: 'Protein'
        },
        fat: {
            value: nutrition.fat_100g || 0,
            unit: 'g',
            name: 'Fat'
        },
        carbs: {
            value: nutrition.carbohydrates_100g || 0,
            unit: 'g',
            name: 'Carbohydrates'
        },
        fiber: {
            value: nutrition.fiber_100g || 0,
            unit: 'g',
            name: 'Fiber'
        },
        sugars: {
            value: nutrition.sugars_100g || 0,
            unit: 'g',
            name: 'Sugars'
        },
        sodium: {
            value: (nutrition.salt_100g || 0) * 400, // Convert salt to sodium (rough approximation)
            unit: 'mg',
            name: 'Sodium'
        }
    };
}

export default function UPCLookup({ onProductFound, onUPCChange, currentUPC = '' }) {
    const [isLooking, setIsLooking] = useState(false);
    const [lookupResult, setLookupResult] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [cameraAvailable, setCameraAvailable] = useState(true);
    const [showNutrition, setShowNutrition] = useState(false); // NEW: Toggle for nutrition display

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
            // Use your existing API
            const response = await fetch(`/api/upc/lookup?upc=${encodeURIComponent(upc)}`);
            const data = await response.json();

            if (data.success && data.product.found) {
                // NEW: Extract and standardize nutrition data from your API
                const standardizedNutrition = standardizeNutritionData(data.product.nutrition);

                // Enhanced product data with standardized nutrition
                const enhancedProduct = {
                    ...data.product,
                    nutrition: standardizedNutrition
                };

                setLookupResult({ success: true, product: enhancedProduct });
                onProductFound(enhancedProduct);
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
        onUPCChange(barcode);
        setShowScanner(false);

        // Auto-lookup the scanned barcode
        handleUPCLookup(barcode);
    };

    const handleScannerClose = () => {
        setShowScanner(false);
    };

    // NEW: Check if nutrition data is available
    const hasNutrition = lookupResult?.success && lookupResult.product.nutrition &&
        Object.values(lookupResult.product.nutrition).some(n => n.value > 0);

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
                                {hasNutrition && (
                                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        🥗 Nutrition Available
                                    </span>
                                )}
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
                                    {/* NEW: Show additional scores */}
                                    {lookupResult.product.scores && lookupResult.product.scores.nova_group && (
                                        <div><strong>NOVA Group:</strong>
                                            <span className={`ml-1 px-2 py-1 text-xs font-bold text-white rounded ${
                                                lookupResult.product.scores.nova_group === 1 ? 'bg-green-500' :
                                                    lookupResult.product.scores.nova_group === 2 ? 'bg-yellow-500' :
                                                        lookupResult.product.scores.nova_group === 3 ? 'bg-orange-500' :
                                                            'bg-red-500'
                                            }`}>
                                                {lookupResult.product.scores.nova_group}
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

                            {/* NEW: Nutrition Section */}
                            {hasNutrition && (
                                <div className="mt-4 pt-4 border-t border-green-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-green-800 font-medium">🥗 Nutrition Information</span>
                                        <button
                                            onClick={() => setShowNutrition(!showNutrition)}
                                            className="text-sm text-green-600 hover:text-green-800 underline"
                                        >
                                            {showNutrition ? 'Hide' : 'Show'} Details
                                        </button>
                                    </div>

                                    {/* Quick Nutrition Preview */}
                                    {!showNutrition && (
                                        <div className="grid grid-cols-4 gap-2 text-xs text-green-700">
                                            {lookupResult.product.nutrition.calories?.value > 0 && (
                                                <div className="text-center bg-green-100 p-2 rounded">
                                                    <div className="font-medium">{Math.round(lookupResult.product.nutrition.calories.value)}</div>
                                                    <div>calories</div>
                                                </div>
                                            )}
                                            {lookupResult.product.nutrition.protein?.value > 0 && (
                                                <div className="text-center bg-green-100 p-2 rounded">
                                                    <div className="font-medium">{lookupResult.product.nutrition.protein.value.toFixed(1)}g</div>
                                                    <div>protein</div>
                                                </div>
                                            )}
                                            {lookupResult.product.nutrition.carbs?.value > 0 && (
                                                <div className="text-center bg-green-100 p-2 rounded">
                                                    <div className="font-medium">{lookupResult.product.nutrition.carbs.value.toFixed(1)}g</div>
                                                    <div>carbs</div>
                                                </div>
                                            )}
                                            {lookupResult.product.nutrition.fat?.value > 0 && (
                                                <div className="text-center bg-green-100 p-2 rounded">
                                                    <div className="font-medium">{lookupResult.product.nutrition.fat.value.toFixed(1)}g</div>
                                                    <div>fat</div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Detailed Nutrition Display */}
                                    {showNutrition && (
                                        <div className="bg-white border border-green-200 rounded-lg p-4">
                                            <div className="text-sm font-medium text-gray-900 mb-3">Nutrition Facts (per 100g)</div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                {Object.entries(lookupResult.product.nutrition).map(([key, nutrient]) => {
                                                    if (!nutrient || nutrient.value <= 0) return null;
                                                    return (
                                                        <div key={key} className="flex justify-between">
                                                            <span className="text-gray-700">{nutrient.name}:</span>
                                                            <span className="font-medium">
                                                                {nutrient.value < 1 ? nutrient.value.toFixed(1) : Math.round(nutrient.value)}
                                                                {nutrient.unit}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-3 text-xs text-gray-500">
                                                * Nutrition data from Open Food Facts community database
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* NEW: Additional Product Information */}
                            {(lookupResult.product.ingredients || lookupResult.product.allergens?.length > 0) && (
                                <div className="mt-4 pt-4 border-t border-green-200">
                                    {lookupResult.product.ingredients && (
                                        <div className="mb-3">
                                            <div className="text-sm font-medium text-green-900 mb-1">Ingredients:</div>
                                            <div className="text-xs text-green-700 max-h-20 overflow-y-auto">
                                                {lookupResult.product.ingredients}
                                            </div>
                                        </div>
                                    )}
                                    {lookupResult.product.allergens && lookupResult.product.allergens.length > 0 && (
                                        <div>
                                            <div className="text-sm font-medium text-orange-900 mb-1">⚠️ Allergens:</div>
                                            <div className="text-xs text-orange-700">
                                                {lookupResult.product.allergens.map(allergen =>
                                                    allergen.replace('en:', '').replace('-', ' ')
                                                ).join(', ')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

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

            {/* Usage Tips - Enhanced */}
            <div className="text-xs text-gray-500 space-y-1">
                <div>💡 <strong>Tips:</strong></div>
                <div>• UPC codes are usually 12-14 digits long</div>
                <div>• Camera scanning works best in good lighting</div>
                <div>• Hold your device steady when scanning</div>
                <div>• Data comes from Open Food Facts community database</div>
                <div>• Nutrition information included when available</div>
                <div>• If not found, you can still add the item manually</div>
            </div>
        </div>
    );
}