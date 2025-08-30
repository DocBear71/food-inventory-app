// file: /src/plugins/native-barcode-scanner.js v3 - FIXED plugin availability testing

import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

/**
 * Native Barcode Scanner Plugin Interface
 * Provides access to native iOS AVFoundation barcode scanning
 */
const NativeBarcodeScanner = registerPlugin('NativeBarcodeScanner', {
    web: () => import('./native-barcode-scanner.web.js').then(m => new m.NativeBarcodeScannerWeb()),
});

/**
 * Check if native barcode scanning is available
 * @returns {Promise<boolean>} True if native scanning is available
 */
export const isNativeScannerAvailable = async () => {
    try {
        console.log('🔧 Testing native scanner availability...');

        // First check if we're on a native platform
        if (!Capacitor.isNativePlatform()) {
            console.log('❌ Not on native platform, native scanner not available');
            return false;
        }

        // Check if the plugin is registered and has the required method
        if (!NativeBarcodeScanner || typeof NativeBarcodeScanner.scanBarcode !== 'function') {
            console.log('❌ NativeBarcodeScanner plugin not properly registered');
            return false;
        }

        // CRITICAL FIX: Actually test if the Swift plugin responds
        try {
            console.log('🔧 Testing Swift plugin response...');
            const result = await NativeBarcodeScanner.checkPermissions();
            console.log('✅ Swift plugin responded successfully:', result);

            // If we get here, the Swift plugin is working
            return true;

        } catch (swiftError) {
            console.log('❌ Swift plugin test failed:', swiftError.message);

            // Check if it's the "not implemented" error (plugin not actually working)
            if (swiftError.message && swiftError.message.includes('not implemented')) {
                console.log('❌ Native plugin not implemented in Swift - this is the core issue');
                return false;
            }

            // Log specific error details for debugging
            console.log('❌ Swift error details:', {
                message: swiftError.message,
                code: swiftError.code,
                stack: swiftError.stack
            });

            // Other errors might still indicate the plugin exists but has permission issues
            // Still return false to be safe
            return false;
        }
    } catch (error) {
        console.log('❌ Native scanner availability check failed:', error.message);
        return false;
    }
};

/**
 * Scan a barcode using native iOS camera
 * @param {ScanOptions} [options] - Scanning options
 * @returns {Promise<ScanResult>} Promise that resolves with scan result
 */
export const scanBarcode = async (options = {}) => {
    try {
        // Verify availability before attempting scan
        const isAvailable = await isNativeScannerAvailable();
        if (!isAvailable) {
            throw new Error('Native scanner not available - Swift plugin not responding');
        }

        console.log('🍎 Starting native barcode scan with options:', options);

        const result = await NativeBarcodeScanner.scanBarcode(options);

        console.log('🍎 Native scan completed:', result);
        return result;

    } catch (error) {
        console.error('🍎 Native barcode scan failed:', error);
        throw error;
    }
};

/**
 * Check camera permissions
 * @returns {Promise<PermissionStatus>} Promise that resolves with permission status
 */
export const checkPermissions = async () => {
    try {
        const isAvailable = await isNativeScannerAvailable();
        if (!isAvailable) {
            throw new Error('Native scanner not available');
        }

        const result = await NativeBarcodeScanner.checkPermissions();
        console.log('🍎 Camera permissions status:', result);
        return result;
    } catch (error) {
        console.error('🍎 Failed to check permissions:', error);
        throw error;
    }
};

/**
 * Request camera permissions
 * @returns {Promise<PermissionStatus>} Promise that resolves with permission status
 */
export const requestPermissions = async () => {
    try {
        const isAvailable = await isNativeScannerAvailable();
        if (!isAvailable) {
            throw new Error('Native scanner not available');
        }

        const result = await NativeBarcodeScanner.requestPermissions();
        console.log('🍎 Camera permissions requested:', result);
        return result;
    } catch (error) {
        console.error('🍎 Failed to request permissions:', error);
        throw error;
    }
};

/**
 * Barcode format constants
 */
export const BarcodeFormats = {
    UPC_E: 'UPC_E',
    UPC_A: 'UPC_A',
    EAN_13: 'EAN_13',
    EAN_8: 'EAN_8',
    CODE_39: 'CODE_39',
    CODE_93: 'CODE_93',
    CODE_128: 'CODE_128',
    ITF: 'ITF',
    ITF_14: 'ITF_14',
    PDF_417: 'PDF_417',
    QR_CODE: 'QR_CODE',
    DATA_MATRIX: 'DATA_MATRIX',
    AZTEC: 'AZTEC',
    CODABAR: 'CODABAR'
};

/**
 * Default scanning options optimized for grocery/product scanning
 */
export const DefaultScanOptions = {
    formats: [
        BarcodeFormats.EAN_13,
        BarcodeFormats.UPC_E,
        BarcodeFormats.CODE_128,
        BarcodeFormats.CODE_39,
        BarcodeFormats.ITF_14
    ],
    enableHapticFeedback: true,
    enableAudioFeedback: true
};

/**
 * Error types that can be thrown by the scanner
 */
export const ScannerErrors = {
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    CAMERA_ERROR: 'CAMERA_ERROR',
    USER_CANCELLED: 'USER_CANCELLED',
    SCANNER_NOT_AVAILABLE: 'SCANNER_NOT_AVAILABLE'
};

export { NativeBarcodeScanner };
export default NativeBarcodeScanner;