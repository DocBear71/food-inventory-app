// file: /src/components/inventory/BarcodeScanner.js

'use client';

import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onBarcodeDetected, onClose, isActive }) {
    const scannerRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(true);
    const cooldownRef = useRef(false);
    const quaggaRef = useRef(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        let Quagga;

        const initializeScanner = async () => {
            if (!isActive || isInitialized || !mountedRef.current) return;

            try {
                setIsLoading(true);
                setError(null);
                setIsScanning(true);
                cooldownRef.current = false;

                // Check if camera is available
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setError('Camera not supported on this device.');
                    setIsLoading(false);
                    return;
                }

                // Dynamic import of Quagga2 (only load when needed)
                const QuaggaModule = await import('@ericblade/quagga2');
                Quagga = QuaggaModule.default;
                quaggaRef.current = Quagga;

                if (!scannerRef.current || !mountedRef.current) return;

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
                        patchSize: "large",
                        halfSample: false
                    },
                    numOfWorkers: 1, // Reduced to prevent conflicts
                    frequency: 5, // Reduced frequency for better accuracy
                    decoder: {
                        readers: [
                            "ean_reader",     // Best for grocery items
                            "upc_reader",     // Standard UPC
                            "upc_e_reader"    // Compact UPC
                        ],
                        multiple: false
                    },
                    locate: true,
                    debug: {
                        showCanvas: false,
                        showPatches: false,
                        showFoundPatches: false,
                        showSkeleton: false,
                        showLabels: false,
                        showPatchLabels: false,
                        showRemainingPatchLabels: false,
                        boxFromPatches: {
                            showTransformed: false,
                            showTransformedBox: false,
                            showBB: false
                        }
                    }
                };

                // Initialize Quagga
                Quagga.init(config, (err) => {
                    if (!mountedRef.current) return;

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
                    if (!mountedRef.current || cooldownRef.current || !isScanning) {
                        console.log('Scanner not ready, ignoring detection');
                        return;
                    }

                    const code = result.codeResult.code;
                    const format = result.codeResult.format;
                    console.log(`Barcode detected: ${code} (format: ${format})`);

                    // Strict validation for UPC codes
                    const cleanCode = code.replace(/\D/g, ''); // Remove non-digits

                    // Validate UPC length (must be exactly 12 digits for UPC-A or 8 for UPC-E)
                    if (cleanCode.length !== 12 && cleanCode.length !== 8 && cleanCode.length !== 13 && cleanCode.length !== 14) {
                        console.log('Invalid UPC length, ignoring:', cleanCode, 'Length:', cleanCode.length);
                        return;
                    }

                    // Additional validation - check if it looks like a real UPC
                    if (cleanCode.length < 8 || cleanCode.startsWith('00000') || cleanCode === '0'.repeat(cleanCode.length)) {
                        console.log('Invalid UPC pattern, ignoring:', cleanCode);
                        return;
                    }

                    // Check result confidence (if available)
                    if (result.codeResult.decodedCodes && result.codeResult.decodedCodes.length > 0) {
                        const avgConfidence = result.codeResult.decodedCodes.reduce((sum, code) => sum + (code.error || 0), 0) / result.codeResult.decodedCodes.length;
                        if (avgConfidence > 0.1) { // Too many errors
                            console.log('Low confidence detection, ignoring. Confidence:', avgConfidence);
                            return;
                        }
                    }

                    console.log('Valid UPC detected:', cleanCode);

                    // Set cooldown to prevent multiple detections
                    cooldownRef.current = true;
                    setIsScanning(false);

                    // Play beep sound
                    playBeepSound();

                    // Visual feedback
                    if (scannerRef.current && mountedRef.current) {
                        scannerRef.current.style.border = '4px solid #10B981';
                        setTimeout(() => {
                            if (scannerRef.current && mountedRef.current) {
                                scannerRef.current.style.border = '';
                            }
                        }, 500);
                    }

                    // Stop scanner and call callback
                    setTimeout(() => {
                        if (mountedRef.current) {
                            cleanupScanner();
                            onBarcodeDetected(cleanCode);
                        }
                    }, 600);
                });

            } catch (error) {
                console.error('Scanner setup error:', error);
                if (mountedRef.current) {
                    setError('Camera scanner not supported on this device.');
                    setIsLoading(false);
                }
            }
        };

        const cleanupScanner = () => {
            if (quaggaRef.current && isInitialized) {
                console.log('Stopping Quagga scanner');
                try {
                    quaggaRef.current.stop();
                    quaggaRef.current.offDetected();
                } catch (error) {
                    console.log('Error stopping Quagga:', error);
                }
                setIsInitialized(false);
                setIsScanning(false);
            }
        };

        if (isActive && mountedRef.current) {
            initializeScanner();
        }

        // Cleanup on unmount or when scanner becomes inactive
        return () => {
            cleanupScanner();
        };
    }, [isActive, onBarcodeDetected]);

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
                                            {/* Scanning line - only show when actively scanning */}
                                            {isScanning && (
                                                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-pulse"></div>
                                            )}

                                            {/* Corner indicators */}
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500"></div>
                                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500"></div>
                                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500"></div>
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500"></div>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
                                        {isScanning ? (
                                            <>📱 Position barcode within the red frame</>
                                        ) : (
                                            <>✅ Barcode detected! Processing...</>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {!isLoading && (
                            <div className="mt-4 space-y-2">
                                <div className="text-sm text-gray-600 text-center">
                                    {isScanning ? (
                                        <>Hold your device steady and ensure good lighting</>
                                    ) : (
                                        <>Processing barcode...</>
                                    )}
                                </div>

                                <div className="flex justify-center space-x-2">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                                        disabled={!isScanning}
                                    >
                                        {isScanning ? 'Cancel' : 'Processing...'}
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
                    <div>• Make sure barcode is clearly visible</div>
                </div>
            </div>
        </div>
    );
}