// file: /src/plugins/native-barcode-scanner.js v10 - ENHANCED debugging for iPad testing

import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

/**
 * Native iOS Scanner Bridge
 */
const NativeScannerBridge = registerPlugin('NativeScannerBridge');

/**
 * Check if native iOS scanner is available with comprehensive debugging
 * @param {Function} debugCallback - Function to receive debug messages
 * @returns {Promise<boolean>} True if native scanning is available
 */
export const isNativeScannerAvailable = async (debugCallback = null) => {
    const debug = debugCallback || console.log;

    try {
        debug('STEP 1: Platform Detection');
        debug('Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
        debug('Capacitor.getPlatform():', Capacitor.getPlatform());

        // Must be on native iOS platform
        if (!Capacitor.isNativePlatform()) {
            debug('FAILED: Not a native platform');
            return false;
        }

        if (Capacitor.getPlatform() !== 'ios') {
            debug('FAILED: Not iOS platform, got:', Capacitor.getPlatform());
            return false;
        }

        debug('✅ STEP 1 PASSED: Platform is native iOS');

        debug('STEP 2: Plugin Registration Check');
        debug('NativeScannerBridge object:', typeof NativeScannerBridge);
        debug('NativeScannerBridge methods:', Object.keys(NativeScannerBridge || {}));

        if (!NativeScannerBridge) {
            debug('FAILED: NativeScannerBridge is null/undefined');
            return false;
        }

        if (typeof NativeScannerBridge.getCameraPermissions !== 'function') {
            debug('FAILED: getCameraPermissions method not found');
            debug('Available methods:', Object.keys(NativeScannerBridge));
            return false;
        }

        debug('✅ STEP 2 PASSED: Plugin object and methods found');

        debug('STEP 3: Testing Plugin Call');

        try {
            const result = await NativeScannerBridge.getCameraPermissions();
            debug('✅ STEP 3 PASSED: Plugin call successful');
            debug('Full result object:', JSON.stringify(result, null, 2));
            debug('result.nativeScanner:', result.nativeScanner);
            debug('result.camera:', result.camera);

            const isAvailable = result && result.nativeScanner === 'available';
            debug('Final availability result:', isAvailable);

            return isAvailable;

        } catch (pluginError) {
            debug('FAILED STEP 3: Plugin call threw error');
            debug('Error message:', pluginError.message);
            debug('Error code:', pluginError.code);
            debug('Full error object:', JSON.stringify(pluginError, Object.getOwnPropertyNames(pluginError), 2));
            return false;
        }

    } catch (outerError) {
        debug('CATASTROPHIC FAILURE in isNativeScannerAvailable');
        debug('Outer error:', outerError.message);
        debug('Stack trace:', outerError.stack);
        return false;
    }
};

/**
 * Present the native iOS barcode scanner
 */
export const presentNativeScanner = async (options = {}) => {
    try {
        console.log('🍎 Calling NativeScannerBridge.presentNativeScanner');
        const result = await NativeScannerBridge.presentNativeScanner(options);
        console.log('🍎 Native scanner result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('🍎 Native scanner error:', error.message);
        throw error;
    }
};

/**
 * Check permissions with detailed debugging
 */
export const getCameraPermissions = async () => {
    try {
        console.log('🍎 Calling NativeScannerBridge.getCameraPermissions');
        const result = await NativeScannerBridge.getCameraPermissions();
        console.log('🍎 Permissions result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('🍎 Permissions error:', error.message);
        throw error;
    }
};

/**
 * Request permissions with detailed debugging
 */
export const requestCameraPermissions = async () => {
    try {
        console.log('🍎 Calling NativeScannerBridge.requestCameraPermissions');
        const result = await NativeScannerBridge.requestCameraPermissions();
        console.log('🍎 Request permissions result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('🍎 Request permissions error:', error.message);
        throw error;
    }
};

// Test function for debugging
export const testPluginConnection = async (debugCallback) => {
    const debug = debugCallback || console.log;

    debug('=== PLUGIN CONNECTION TEST ===');

    debug('1. Capacitor Info:');
    debug('  - Native Platform:', Capacitor.isNativePlatform());
    debug('  - Platform:', Capacitor.getPlatform());
    debug('  - Plugin Info:', Capacitor.getPlugins ? Capacitor.getPlugins() : 'getPlugins not available');

    debug('2. Plugin Object:');
    debug('  - Type:', typeof NativeScannerBridge);
    debug('  - Null check:', NativeScannerBridge === null);
    debug('  - Undefined check:', NativeScannerBridge === undefined);
    debug('  - Methods:', Object.keys(NativeScannerBridge || {}));

    debug('3. Direct Method Test:');
    try {
        if (NativeScannerBridge && typeof NativeScannerBridge.getCameraPermissions === 'function') {
            debug('  - getCameraPermissions method found, calling...');
            const result = await NativeScannerBridge.getCameraPermissions();
            debug('  - ✅ SUCCESS:', JSON.stringify(result, null, 2));
            return true;
        } else {
            debug('  - ❌ getCameraPermissions method not found or not a function');
            return false;
        }
    } catch (error) {
        debug('  - ❌ Method call failed:', error.message);
        return false;
    }
};

export const scanBarcode = presentNativeScanner;
export default NativeScannerBridge;