// file: /src/plugins/native-barcode-scanner.web.js v1 - Web fallback for native barcode scanner

import { WebPlugin } from '@capacitor/core';

export class NativeBarcodeScannerWeb extends WebPlugin {
    async scanBarcode(options = {}) {
        console.log('🌐 Native barcode scanner not available on web, using fallback');

        // For web platforms, we'll throw an error to indicate native scanning isn't available
        // The React component should catch this and fall back to web-based scanning
        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
        await NativeDialog.showError({
            title: 'Native Barcode Failed',
            message: 'Native barcode scanning not available on web platform. Use web fallback scanner.'
        });
        return;
    }

    async checkPermissions() {
        // On web, we can check if camera API is available
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // We can't actually check permissions without requesting them on web
            return { camera: 'prompt' };
        } else {
            return { camera: 'denied' };
        }
    }

    async requestPermissions() {
        // On web, requesting permissions requires actually starting the camera
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // Test camera access
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Stop the stream immediately
                stream.getTracks().forEach(track => track.stop());
                return { camera: 'granted' };
            } else {
                return { camera: 'denied' };
            }
        } catch (error) {
            console.log('Web camera permission denied:', error);
            return { camera: 'denied' };
        }
    }
}