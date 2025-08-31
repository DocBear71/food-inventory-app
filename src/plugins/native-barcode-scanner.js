// file: /src/plugins/native-barcode-scanner.js v5 - Pure native iOS scanner bridge

import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import {PlatformDetection} from "@/utils/PlatformDetection.js";

/**
 * Native iOS Scanner Bridge
 * This presents a completely native iOS scanner that Apple will approve
 */
const NativeScannerBridge = registerPlugin('NativeScannerBridge', {
    web: () => import('./native-barcode-scanner.web').then(m => new m.NativeBarcodeScannerWeb()),
});

/**
 * Check if native iOS scanner is available and working
 * @param {Function} addDebugInfo - Optional debug callback function
 * @returns {Promise<boolean>} True if native scanning is available
 */
// We need to pass the debug function from the scanner component
export const isNativeScannerAvailable = async (addDebugInfo = null) => {
    try {
        if (addDebugInfo) addDebugInfo('🔧 Testing native iOS scanner availability...');

        if (!PlatformDetection.isIOS()) {
            addDebugInfo('❌ Not iOS platform');
            return false;
        }

        if (!PlatformDetection.isRunningInMobileApp()) {
            addDebugInfo('❌ Not running in native mobile app');
            return false;
        }

        // First check if we're on a native platform
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
            if (addDebugInfo) addDebugInfo('❌ Not on native iOS platform', {
                isNative: Capacitor.isNativePlatform(),
                platform: Capacitor.getPlatform()
            });
            return false;
        }

        if (addDebugInfo) addDebugInfo('✅ Platform check passed - testing NativeScannerBridge...');

        // Test if the native bridge responds
        try {
            const result = await NativeScannerBridge.checkPermissions();
            if (addDebugInfo) addDebugInfo('✅ NativeScannerBridge responded successfully', result);
            return result.nativeScanner === 'available';
        } catch (bridgeError) {
            if (addDebugInfo) addDebugInfo('❌ NativeScannerBridge test FAILED', {
                error: bridgeError.message,
                code: bridgeError.code,
                type: typeof bridgeError
            });
            return false;
        }
    } catch (error) {
        if (addDebugInfo) addDebugInfo('❌ Availability check completely failed', {
            error: error.message,
            stack: error.stack?.split('\n')[0]
        });
        return false;
    }
};

/**
 * Present the native iOS barcode scanner
 * @param {Object} options - Scanner options (currently ignored, native scanner uses optimal settings)
 * @returns {Promise<ScanResult>} Promise that resolves with scan result
 */
export const presentNativeScanner = async (options = {}) => {
    try {
        console.log('🍎 Presenting native iOS barcode scanner');

        const result = await NativeScannerBridge.presentNativeScanner(options);
        console.log('🍎 Native iOS scanner result:', result);

        return result;
    } catch (error) {
        console.error('🍎 Native iOS scanner failed:', error);
        throw error;
    }
};

/**
 * Check camera permissions (uses native iOS permission system)
 * @returns {Promise<PermissionStatus>} Promise that resolves with permission status
 */
export const checkPermissions = async () => {
    try {
        const result = await NativeScannerBridge.checkPermissions();
        console.log('🍎 Native iOS camera permissions:', result);
        return result;
    } catch (error) {
        console.error('🍎 Failed to check native iOS permissions:', error);
        throw error;
    }
};

/**
 * Request camera permissions (uses native iOS permission system)
 * @returns {Promise<PermissionStatus>} Promise that resolves with permission status
 */
export const requestPermissions = async () => {
    try {
        const result = await NativeScannerBridge.requestPermissions();
        console.log('🍎 Native iOS camera permissions requested:', result);
        return result;
    } catch (error) {
        console.error('🍎 Failed to request native iOS permissions:', error);
        throw error;
    }
};

// Legacy function names for compatibility
export const scanBarcode = async (options = {}) => {
    return await presentNativeScanner(options);
};

/**
 * Error types that can be returned by the native scanner
 */
export const ScannerErrors = {
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    CAMERA_ERROR: 'CAMERA_ERROR',
    USER_CANCELLED: 'USER_CANCELLED',
    SCANNER_NOT_AVAILABLE: 'SCANNER_NOT_AVAILABLE',
    PRESENTATION_ERROR: 'PRESENTATION_ERROR'
};

export { NativeScannerBridge };