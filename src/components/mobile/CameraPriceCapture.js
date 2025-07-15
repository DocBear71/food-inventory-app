'use client';
// file: /src/components/mobile/CameraPriceCapture.js - Camera integration for prices

import { useState, useRef, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function CameraPriceCapture({ onPriceCaptured, onClose }) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState('');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (error) {
            console.error('Camera access failed:', error);
            setError('Camera access required for price capture');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePrice = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setIsCapturing(true);

        try {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            // Convert canvas to blob
            canvas.toBlob(async (blob) => {
                try {
                    // In a real implementation, you'd send this to an OCR service
                    // For now, we'll simulate price extraction
                    const mockPrice = (Math.random() * 10 + 1).toFixed(2);

                    setTimeout(() => {
                        onPriceCaptured({
                            price: mockPrice,
                            confidence: 0.85,
                            image: canvas.toDataURL()
                        });
                        setIsCapturing(false);
                    }, 2000);

                } catch (error) {
                    console.error('Price extraction failed:', error);
                    setError('Failed to extract price from image');
                    setIsCapturing(false);
                }
            }, 'image/jpeg', 0.8);

        } catch (error) {
            console.error('Capture failed:', error);
            setError('Failed to capture image');
            setIsCapturing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
                <div className="flex items-center justify-between text-white">
                    <div>
                        <h2 className="text-lg font-semibold">📷 Capture Price</h2>
                        <p className="text-sm opacity-75">Point camera at price tag</p>
                    </div>
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-20"
                    >
                        ✕
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Camera View */}
            <div className="relative w-full h-full">
                {error ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-white">
                            <div className="text-4xl mb-4">⚠️</div>
                            <p className="text-lg">{error}</p>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="mt-4 bg-white text-black px-6 py-3 rounded-lg"
                            >
                                Close
                            </TouchEnhancedButton>
                        </div>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />

                        {/* Capture Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="border-2 border-white border-dashed w-64 h-32 rounded-lg"></div>
                        </div>

                        {/* Capture Button */}
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                            <TouchEnhancedButton
                                onClick={capturePrice}
                                disabled={isCapturing}
                                className={`w-16 h-16 rounded-full border-4 border-white ${
                                    isCapturing
                                        ? 'bg-yellow-500 animate-pulse'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                            >
                                {isCapturing ? '📷' : '💰'}
                            </TouchEnhancedButton>
                        </div>

                        {isCapturing && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-75 text-white px-6 py-4 rounded-lg text-center">
                                <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                                <p className="text-sm">Extracting price...</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
