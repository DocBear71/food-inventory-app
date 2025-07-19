// file: /src/lib/mobile-modal-bridge.js v1 - Mobile-specific Modal integration

import { modalBridge } from './modal-bridge';

class MobileModalBridge {
    constructor() {
        this.isNative = typeof window !== 'undefined' && window.Capacitor;
        this.bridge = modalBridge;
    }

    async extractRecipe(videoData) {
        try {
            // Add mobile-specific metadata
            const enhancedData = {
                ...videoData,
                platform_info: {
                    isMobile: true,
                    isNative: this.isNative,
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'mobile',
                    timestamp: new Date().toISOString()
                }
            };

            return await this.bridge.extractRecipeWithNutrition(enhancedData);
        } catch (error) {
            console.error('Mobile recipe extraction failed:', error);
            // Mobile-specific error handling
            if (this.isNative) {
                // Could show native alert or toast
                console.log('Native mobile error handling would go here');
            }
            throw error;
        }
    }

    async processReceipt(receiptData) {
        try {
            const enhancedData = {
                ...receiptData,
                mobile_optimized: true,
                compression_enabled: this.isNative
            };

            return await this.bridge.processReceiptWithSuggestions(enhancedData);
        } catch (error) {
            console.error('Mobile receipt processing failed:', error);
            throw error;
        }
    }
}

export const mobileModalBridge = new MobileModalBridge();
export default mobileModalBridge;