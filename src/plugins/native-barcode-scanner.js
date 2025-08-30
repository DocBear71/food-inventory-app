// file: /src/plugins/native-barcode-scanner.js v2 - FIXED with proper availability checking

import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

/**
 * Native Barcode Scanner Plugin Interface
 * Provides access to native iOS AVFoundation barcode scanning
 */
const NativeBarcodeScanner = registerPlugin('NativeBarcodeScanner', {
    web: () => import('./native-barcode-scanner.web').then(m => new m.NativeBarcodeScannerWeb()),
});

/**
 * Check if native barcode scanning is available
 * @returns {Promise<boolean>} True if native scanning is available
 */
export const isNativeScannerAvailable = async () => {
    try {
        // First check if we're on a native platform
        if (!Capacitor.isNativePlatform()) {
            console.log('Not on native platform, native scanner not available');
            return false;
        }

        // Check if the plugin is registered and has the required method
        if (!NativeBarcodeScanner || typeof NativeBarcodeScanner.scanBarcode !== 'function') {
            console.log('NativeBarcodeScanner plugin not properly registered');
            return false;
        }

        // Try to call a test method to verify the plugin actually works
        try {
            await NativeBarcodeScanner.checkPermissions();
            console.log('Native scanner plugin verified as working');
            return true;
        } catch (error) {
            console.log('Native scanner plugin test failed:', error.message);
            return false;
        }
    } catch (error) {
        console.log('Native scanner availability check failed:', error.message);
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
            throw new Error('Native scanner not available');
        }

        console.log('Starting native barcode scan with options:', options);

        const result = await NativeBarcodeScanner.scanBarcode(options);

        console.log('Native scan completed:', result);
        return result;

    } catch (error) {
        console.error('Native barcode scan failed:', error);
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
        console.log('Camera permissions status:', result);
        return result;
    } catch (error) {
        console.error('Failed to check permissions:', error);
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
        console.log('Camera permissions requested:', result);
        return result;
    } catch (error) {
        console.error('Failed to request permissions:', error);
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