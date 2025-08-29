// file: /src/plugins/haptic-feedback.web.js v1 - Web fallback for haptic feedback

import { WebPlugin } from '@capacitor/core';

export class HapticFeedbackWeb extends WebPlugin {

    async isAvailable() {
        // Check if the browser supports vibration API
        const hasVibration = 'vibrate' in navigator;
        console.log('🌐 Web haptic fallback available:', hasVibration);
        return { available: hasVibration };
    }

    async prepare() {
        // No preparation needed for web
        return { prepared: true };
    }

    async impact(options = {}) {
        const style = options.style || 'medium';

        if ('vibrate' in navigator) {
            // Map haptic styles to vibration patterns
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [30]
            };

            const pattern = patterns[style] || patterns.medium;
            navigator.vibrate(pattern);
            console.log(`🌐 Web vibration (${style}):`, pattern);
        }
    }

    async notification(options = {}) {
        const type = options.type || 'success';

        if ('vibrate' in navigator) {
            // Map notification types to vibration patterns
            const patterns = {
                success: [10, 10, 10],
                warning: [20, 20, 20],
                error: [50, 20, 50]
            };

            const pattern = patterns[type] || patterns.success;
            navigator.vibrate(pattern);
            console.log(`🌐 Web notification vibration (${type}):`, pattern);
        }
    }

    async selection() {
        if ('vibrate' in navigator) {
            navigator.vibrate([5]);
            console.log('🌐 Web selection vibration');
        }
    }

    async vibrate(options = {}) {
        const duration = options.duration || 500;

        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
            console.log(`🌐 Web vibration: ${duration}ms`);
        }
    }

    // App-specific methods with web fallbacks
    async buttonTap() {
        if ('vibrate' in navigator) {
            navigator.vibrate([5]);
        }
    }

    async actionSuccess() {
        if ('vibrate' in navigator) {
            navigator.vibrate([10, 5, 10]);
        }
    }

    async actionError() {
        if ('vibrate' in navigator) {
            navigator.vibrate([30, 10, 30]);
        }
    }

    async formSubmit() {
        if ('vibrate' in navigator) {
            navigator.vibrate([15]);
        }
    }

    async navigationChange() {
        if ('vibrate' in navigator) {
            navigator.vibrate([8]);
        }
    }

    async modalOpen() {
        if ('vibrate' in navigator) {
            navigator.vibrate([5]);
        }
    }

    async modalClose() {
        if ('vibrate' in navigator) {
            navigator.vibrate([5]);
        }
    }

    // Inventory-specific methods
    async itemAdded() {
        if ('vibrate' in navigator) {
            navigator.vibrate([10, 5, 5]);
        }
    }

    async itemRemoved() {
        if ('vibrate' in navigator) {
            navigator.vibrate([25]);
        }
    }

    async scanSuccess() {
        if ('vibrate' in navigator) {
            navigator.vibrate([10, 5, 10, 5, 15]);
        }
    }

    async scanError() {
        if ('vibrate' in navigator) {
            navigator.vibrate([40, 10, 40]);
        }
    }
}