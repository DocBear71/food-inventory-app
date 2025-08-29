// file: /src/plugins/native-barcode-scanner.js v1 - JavaScript interface for native iOS barcode scanner

import { registerPlugin } from '@capacitor/core';

/**
 * Native Barcode Scanner Plugin Interface
 * Provides access to native iOS AVFoundation barcode scanning
 */
const NativeBarcodeScanner = registerPlugin('NativeBarcodeScanner', {
    web: () => import('./native-barcode-scanner.web').then(m => new m.NativeBarcodeScannerWeb()),
});

/**
 * Barcode scanning options
 * @typedef {Object} ScanOptions
 * @property {string[]} [formats] - Array of barcode formats to scan for
 * @property {boolean} [enableHapticFeedback=true] - Enable haptic feedback on scan
 * @property {boolean} [enableAudioFeedback=true] - Enable audio feedback on scan
 */

/**
 * Barcode scan result
 * @typedef {Object} ScanResult
 * @property {boolean} hasContent - Whether a barcode was successfully scanned
 * @property {string} content - The barcode content/value
 * @property {string} format - The barcode format (e.g., 'EAN_13', 'UPC_E')
 * @property {string} type - The raw AVFoundation type
 * @property {boolean} cancelled - Whether the scan was cancelled by user
 * @property {string} source - Source of the scan ('native_ios_avfoundation' or 'web_fallback')
 */

/**
 * Permission status result
 * @typedef {Object} PermissionStatus
 * @property {string} camera - Camera permission status ('granted', 'denied', 'prompt')
 */

export { NativeBarcodeScanner };

/**
 * Scan a barcode using native iOS camera
 * @param {ScanOptions} [options] - Scanning options
 * @returns {Promise<ScanResult>} Promise that resolves with scan result
 */
export const scanBarcode = async (options = {}) => {
    try {
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
        const result = await NativeBarcodeScanner.requestPermissions();
        console.log('🍎 Camera permissions requested:', result);
        return result;
    } catch (error) {
        console.error('🍎 Failed to request permissions:', error);
        throw error;
    }
};

/**
 * Check if native barcode scanning is available
 * @returns {boolean} True if native scanning is available
 */
export const isNativeScannerAvailable = () => {
    return NativeBarcodeScanner && typeof NativeBarcodeScanner.scanBarcode === 'function';
};

/**
 * Barcode format constants
 */
export const BarcodeFormats = {
    UPC_E: 'UPC_E',
    UPC_A: 'UPC_A', // Note: UPC-A is typically represented as EAN-13 with leading zero
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

export default NativeBarcodeScanner;