// file: /src/components/inventory/BarcodeScanner.js

'use client';

import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onBarcodeDetected, onClose, isActive }) {
    const scannerRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasDetectedRef = useRef(false); // Prevent multiple detections
    const quaggaRef = useRef(null);

    useEffect(() => {
        let Quagga;

        const initializeScanner = async () => {
            if (!isActive || isInitialized) return;

            try {
                setIsLoading(true);
                setError(null);

                // Dynamic import of Quagga2 (only load when needed)
                const QuaggaModule = await import('@ericblade/quagga2');
                Quagga = QuaggaModule.default;

                if (!scannerRef.current) return;

                // Configure Quagga2 for barcode scanning
                const config = {
                    inputStream: {
                        name: "Live",
                        type: "LiveStream",
                        target: scannerRef.current,
                        constraints: {
                            width: { min: 640, ideal: 1280 },
                            height: { min: 480, ideal: 720 },
                            facingMode: "environment", // Use back camera
                            aspectRatio: { min: 1, max: 2 }
                        }
                    },
                    locator: {
                        patchSize: "large", // Changed from medium to large for better accuracy
                        halfSample: false   // Changed to false for better quality
                    },
                    numOfWorkers: 1, // Reduced workers to prevent conflicts
                    frequency: 5,    // Reduced frequency to prevent over-scanning
                    decoder: {
                        readers: [
                            "ean_reader",     // Prioritize EAN for grocery items
                            "upc_reader",
                            "upc_e_reader",
                            "code_128_reader",
                            "ean_8_reader"
                        ],
                        multiple: false // Only detect one barcode at a time
                    },
                    locate: true
                };

                // Initialize Quagga
                Quagga.init(config, (err) => {
                    if (err) {
                        console.error('Quagga initialization error:', err);
                        if (err.name === 'NotAllowedError') {
                            setError('Camera permission denied. Please allow camera access and try again.');
                        } else if (err.name === 'NotFoundError') {
                            setError('No camera found. Please ensure your device has a camera.');
                        } else if (err.name === 'NotSupportedError') {
                            setError('Camera not supported by this browser.');
                        } else {
                            setError('Failed to initialize camera scanner. Please check camera permissions.');
                        }
                        setIsLoading(false);
                        return;
                    }

                    console.log('Quagga initialized successfully');
                    Quagga.start();
                    setIsInitialized(true);
                    setIsLoading(false);
                });

                // Set up barcode detection handler
                Quagga.onDetected((result) => {
                    // Prevent multiple rapid detections
                    if (cooldownRef.current || !isScanning) {
                        console.log('Scanner in cooldown, ignoring detection');
                        return;
                    }

                    const code = result.codeResult.code;
                    const format = result.codeResult.format;
                    console.log(`Barcode detected: ${code} (format: ${format})`);

                    // Validate UPC length and format
                    const cleanCode = code.replace(/\D/g, ''); // Remove non-digits
                    if (cleanCode.length < 10 || cleanCode.length > 14) {
                        console.log('Invalid UPC length, ignoring:', cleanCode);
                        return; // Ignore invalid codes
                    }

                    // Set cooldown to prevent multiple detections
                    cooldownRef.current = true;
                    setIsScanning(false);

                    // Stop scanning immediately to prevent multiple detections
                    if (Quagga && isInitialized) {
                        console.log('Stopping scanner after successful detection');
                        Quagga.stop();
                        Quagga.offDetected();
                        setIsInitialized(false);
                    }

                    // Play beep sound (optional)
                    playBeepSound();

                    // Brief visual feedback
                    if (scannerRef.current) {
                        scannerRef.current.style.border = '4px solid #10B981';
                        setTimeout(() => {
                            if (scannerRef.current) {
                                scannerRef.current.style.border = '';
                            }
                        }, 500);
                    }

                    // Small delay to ensure scanner is stopped before callback
                    setTimeout(() => {
                        onBarcodeDetected(cleanCode);
                    }, 200);
                });

            } catch (error) {
                console.error('Scanner setup error:', error);
                setError('Camera scanner not supported on this device.');
                setIsLoading(false);
            }
        };

        const cleanupScanner = () => {
            if (Quagga && isInitialized) {
                console.log('Stopping Quagga scanner');
                Quagga.stop();
                Quagga.offDetected();
                setIsInitialized(false);
            }
        };

        if (isActive) {
            initializeScanner();
        }

        // Cleanup on unmount or when scanner becomes inactive
        return cleanupScanner;
    }, [isActive, isInitialized, onBarcodeDetected]);

    // Play a beep sound when barcode is detected
    const playBeepSound = () => {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgfCkCW3PH');
            audio.play().catch(() => {
                // Ignore audio play errors (some browsers block autoplay)
            });
        } catch (error) {
            // Ignore audio errors
        }
    };

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-screen overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">📷 Scan Barcode</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {error ? (
                    <div className="text-center py-8">
                        <div className="text-red-600 mb-4">❌ {error}</div>
                        <div className="text-sm text-gray-500 mb-4">
                            Please ensure your browser has camera permissions enabled and try again.
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            Close Scanner
                        </button>
                    </div>
                ) : (
                    <>
                        {isLoading && (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <div className="text-gray-600">Starting camera...</div>
                            </div>
                        )}

                        {/* Camera view */}
                        <div className="relative">
                            <div
                                ref={scannerRef}
                                className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden"
                                style={{ display: isLoading ? 'none' : 'block' }}
                            />

                            {!isLoading && (
                                <>
                                    {/* Scanning overlay with targeting reticle */}
                                    <div className="absolute inset-0 border-2 border-transparent rounded-lg pointer-events-none">
                                        {/* Targeting box */}
                                        <div className="absolute inset-4 border-2 border-red-500 rounded-lg">
                                            {/* Scanning line */}
                                            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse"></div>

                                            {/* Corner indicators */}
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500"></div>
                                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500"></div>
                                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500"></div>
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500"></div>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
                                        📱 Position barcode within the red frame
                                    </div>
                                </>
                            )}
                        </div>

                        {!isLoading && (
                            <div className="mt-4 space-y-2">
                                <div className="text-sm text-gray-600 text-center">
                                    Hold your device steady and ensure good lighting
                                </div>

                                <div className="flex justify-center space-x-2">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Tips */}
                <div className="mt-4 text-xs text-gray-500 text-center space-y-1">
                    <div>💡 <strong>Tips:</strong></div>
                    <div>• Works best with good lighting</div>
                    <div>• Hold device steady for 1-2 seconds</div>
                    <div>• Try different angles if not detecting</div>
                </div>
            </div>
        </div>
    );
}