// file: /src/plugins/direct-native-scanner.js v1 - Direct communication with native iOS scanner

import { PlatformDetection } from '@/utils/PlatformDetection';

class DirectNativeScanner {
    constructor() {
        this.isAvailable = false;
        this.pendingCallbacks = new Map();
        this.callbackId = 0;

        // Set up global handlers
        if (typeof window !== 'undefined') {
            window.handleNativeScanResult = this.handleScanResult.bind(this);
            window.handleNativePermissionResult = this.handlePermissionResult.bind(this);

            // Add a delay before checking availability to ensure Swift registration is complete
            setTimeout(() => {
                this.checkAvailability();
            }, 1000);
        }
    }

    //test to compile

    checkAvailability() {
        this.isAvailable = PlatformDetection.isIOS() &&
            PlatformDetection.isRunningInMobileApp() &&
            typeof window !== 'undefined' &&
            window.webkit &&
            window.webkit.messageHandlers &&
            window.webkit.messageHandlers.nativeScannerBridge;

        console.log('Direct Native Scanner availability:', this.isAvailable);
    }

    // Send message to native iOS
    sendToNative(action, data = {}) {
        if (!this.isAvailable) {
            return Promise.reject(new Error('Direct native scanner not available'));
        }

        try {
            const message = { action, ...data };
            window.webkit.messageHandlers.nativeScannerBridge.postMessage(message);
            console.log('Sent to native:', message);
            return Promise.resolve();
        } catch (error) {
            console.error('Error sending to native:', error);
            return Promise.reject(error);
        }
    }

    // Present native scanner
    async presentScanner(options = {}) {
        if (!this.isAvailable) {
            throw new Error('Direct native scanner not available on this platform');
        }

        return new Promise((resolve, reject) => {
            const callbackId = this.callbackId++;
            this.pendingCallbacks.set(callbackId, { resolve, reject, type: 'scan' });

            // Set timeout for scan
            setTimeout(() => {
                if (this.pendingCallbacks.has(callbackId)) {
                    this.pendingCallbacks.delete(callbackId);
                    reject(new Error('Scan timeout'));
                }
            }, 30000);

            // Store callback ID for result handling
            this.currentScanCallbackId = callbackId;

            this.sendToNative('presentScanner', options).catch(error => {
                this.pendingCallbacks.delete(callbackId);
                reject(error);
            });
        });
    }

    // Check camera permissions
    async checkPermissions() {
        if (!this.isAvailable) {
            throw new Error('Direct native scanner not available on this platform');
        }

        return new Promise((resolve, reject) => {
            const callbackId = this.callbackId++;
            this.pendingCallbacks.set(callbackId, { resolve, reject, type: 'permission' });

            setTimeout(() => {
                if (this.pendingCallbacks.has(callbackId)) {
                    this.pendingCallbacks.delete(callbackId);
                    reject(new Error('Permission check timeout'));
                }
            }, 10000);

            this.currentPermissionCallbackId = callbackId;

            this.sendToNative('checkPermissions').catch(error => {
                this.pendingCallbacks.delete(callbackId);
                reject(error);
            });
        });
    }

    // Handle scan results from native
    handleScanResult(result) {
        console.log('Received scan result from native:', result);

        const callbackId = this.currentScanCallbackId;
        if (callbackId !== undefined && this.pendingCallbacks.has(callbackId)) {
            const { resolve, reject } = this.pendingCallbacks.get(callbackId);
            this.pendingCallbacks.delete(callbackId);

            if (result.success) {
                resolve({
                    hasContent: true,
                    content: result.barcode,
                    format: result.format,
                    cancelled: false,
                    source: result.source
                });
            } else if (result.error === 'User cancelled') {
                resolve({
                    hasContent: false,
                    content: '',
                    format: '',
                    cancelled: true,
                    source: result.source
                });
            } else {
                reject(new Error(result.error || 'Unknown scan error'));
            }
        }

        this.currentScanCallbackId = undefined;
    }

    // Handle permission results from native
    handlePermissionResult(result) {
        console.log('Received permission result from native:', result);

        const callbackId = this.currentPermissionCallbackId;
        if (callbackId !== undefined && this.pendingCallbacks.has(callbackId)) {
            const { resolve } = this.pendingCallbacks.get(callbackId);
            this.pendingCallbacks.delete(callbackId);

            resolve({
                camera: result.camera,
                nativeScanner: result.available ? 'available' : 'unavailable'
            });
        }

        this.currentPermissionCallbackId = undefined;
    }

    // Test connection to native
    async testConnection(debugCallback) {
        const debug = debugCallback || console.log;

        debug('=== DIRECT NATIVE SCANNER TEST ===');
        debug('Platform checks:');
        debug('  - iOS:', PlatformDetection.isIOS());
        debug('  - Native app:', PlatformDetection.isRunningInMobileApp());
        debug('  - WebKit available:', !!(window.webkit && window.webkit.messageHandlers));
        debug('  - Bridge available:', !!(window.webkit?.messageHandlers?.nativeScannerBridge));
        debug('  - Overall available:', this.isAvailable);

        if (!this.isAvailable) {
            debug('❌ Direct native scanner not available');
            return false;
        }

        try {
            debug('Testing permission check...');
            const permissions = await this.checkPermissions();
            debug('✅ Permission check successful:', permissions);
            return true;
        } catch (error) {
            debug('❌ Permission check failed:', error.message);
            return false;
        }
    }
}

// Create singleton instance
const directNativeScanner = new DirectNativeScanner();

// Export functions
export const isDirectNativeScannerAvailable = () => {
    return directNativeScanner.isAvailable;
};

export const presentDirectNativeScanner = async (options = {}) => {
    return await directNativeScanner.presentScanner(options);
};

export const checkDirectNativePermissions = async () => {
    return await directNativeScanner.checkPermissions();
};

export const testDirectNativeConnection = async (debugCallback) => {
    return await directNativeScanner.testConnection(debugCallback);
};

// Legacy compatibility exports
export const scanBarcode = presentDirectNativeScanner;
export const checkPermissions = checkDirectNativePermissions;
export const presentNativeScanner = presentDirectNativeScanner;

export default directNativeScanner;