// file: /src/plugins/minimal-native-scanner.js v1 - Clean JavaScript interface for MinimalNativeScanner

import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

/**
 * Minimal Native Scanner - Clean implementation avoiding Capacitor conflicts
 */
const MinimalNativeScanner = registerPlugin('MinimalNativeScanner');

/**
 * Check if minimal native scanner is available
 * @param {Function} debugCallback - Function to receive debug messages
 * @returns {Promise<boolean>} True if native scanning is available
 */
export const isMinimalScannerAvailable = async (debugCallback = null) => {
    const debug = debugCallback || console.log;

    try {
        debug('STEP 1: Platform Detection');
        debug('Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
        debug('Capacitor.getPlatform():', Capacitor.getPlatform());

        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
            debug('FAILED: Not native iOS platform');
            return false;
        }

        debug('✅ STEP 1 PASSED: Platform is native iOS');

        debug('STEP 2: Plugin Registration Check');
        debug('MinimalNativeScanner object:', typeof MinimalNativeScanner);
        debug('MinimalNativeScanner methods:', Object.keys(MinimalNativeScanner || {}));

        if (!MinimalNativeScanner) {
            debug('FAILED: MinimalNativeScanner is null/undefined');
            return false;
        }

        if (typeof MinimalNativeScanner.getCameraStatus !== 'function') {
            debug('FAILED: getCameraStatus method not found');
            debug('Available methods:', Object.keys(MinimalNativeScanner));
            return false;
        }

        debug('✅ STEP 2 PASSED: Plugin object and methods found');

        debug('STEP 3: Testing Plugin Call');
        try {
            const result = await MinimalNativeScanner.getCameraStatus();
            debug('✅ STEP 3 PASSED: Plugin call successful');
            debug('Full result object:', JSON.stringify(result, null, 2));

            const isAvailable = result && result.nativeScanner === 'available';
            debug('Final availability result:', isAvailable);
            return isAvailable;

        } catch (pluginError) {
            debug('FAILED STEP 3: Plugin call threw error');
            debug('Error message:', pluginError.message);
            debug('Error code:', pluginError.code);
            return false;
        }

    } catch (outerError) {
        debug('CATASTROPHIC FAILURE in isMinimalScannerAvailable');
        debug('Outer error:', outerError.message);
        return false;
    }
};

/**
 * Scan barcode using native camera
 * @param {Object} options - Scanner options
 * @returns {Promise<Object>} Scan result
 */
export const scanWithNativeCamera = async (options = {}) => {
    try {
        console.log('🍎 Calling MinimalNativeScanner.scanWithNativeCamera');
        const result = await MinimalNativeScanner.scanWithNativeCamera(options);
        console.log('🍎 Minimal native scanner result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('🍎 Minimal native scanner error:', error.message);
        throw error;
    }
};

/**
 * Get camera permission status
 * @returns {Promise<Object>} Permission status
 */
export const getCameraStatus = async () => {
    try {
        console.log('🍎 Calling MinimalNativeScanner.getCameraStatus');
        const result = await MinimalNativeScanner.getCameraStatus();
        console.log('🍎 Camera status result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('🍎 Camera status error:', error.message);
        throw error;
    }
};

/**
 * Request camera access
 * @returns {Promise<Object>} Permission result
 */
export const requestCameraAccess = async () => {
    try {
        console.log('🍎 Calling MinimalNativeScanner.requestCameraAccess');
        const result = await MinimalNativeScanner.requestCameraAccess();
        console.log('🍎 Camera access result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('🍎 Camera access error:', error.message);
        throw error;
    }
};

// Test function for debugging
export const testMinimalPluginConnection = async (debugCallback) => {
    const debug = debugCallback || console.log;

    debug('=== MINIMAL PLUGIN CONNECTION TEST ===');

    debug('1. Plugin Object:');
    debug('  - Type:', typeof MinimalNativeScanner);
    debug('  - Null check:', MinimalNativeScanner === null);
    debug('  - Undefined check:', MinimalNativeScanner === undefined);
    debug('  - Methods:', Object.keys(MinimalNativeScanner || {}));

    debug('2. Direct Method Test:');
    try {
        if (MinimalNativeScanner && typeof MinimalNativeScanner.getCameraStatus === 'function') {
            debug('  - getCameraStatus method found, calling...');
            const result = await MinimalNativeScanner.getCameraStatus();
            debug('  - ✅ SUCCESS:', JSON.stringify(result, null, 2));
            return true;
        } else {
            debug('  - ❌ getCameraStatus method not found or not a function');
            return false;
        }
    } catch (error) {
        debug('  - ❌ Method call failed:', error.message);
        return false;
    }
};

// Legacy compatibility - map to new method
export const presentNativeScanner = scanWithNativeCamera;
export const checkPermissions = getCameraStatus;
export const requestPermissions = requestCameraAccess;

export default MinimalNativeScanner;