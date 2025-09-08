// file: /src/components/mobile/MobileHaptics.js v2 - Updated to use native iOS haptic feedback

import { PlatformDetection } from '@/utils/PlatformDetection';

// Import our native haptic plugin
import {
    hapticButtonTap,
    hapticActionSuccess,
    hapticActionError,
    hapticFormSubmit,
    hapticImpact,
    hapticNotification,
    hapticSelection,
    hapticItemAdded,
    hapticItemRemoved,
    hapticScanSuccess,
    hapticScanError,
    hapticModalOpen,
    hapticModalClose,
    hapticNavigationChange,
    initializeHaptics,
    HapticStyles,
    NotificationTypes
} from '@/plugins/haptic-feedback';

// Legacy haptic implementation for fallback
const legacyHaptics = {
    light: () => {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate([10]);
            }
        } catch (error) {
            console.log('Legacy light haptic failed:', error);
        }
    },

    medium: () => {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate([20]);
            }
        } catch (error) {
            console.log('Legacy medium haptic failed:', error);
        }
    },

    heavy: () => {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate([30]);
            }
        } catch (error) {
            console.log('Legacy heavy haptic failed:', error);
        }
    },

    success: () => {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate([10, 5, 10]);
            }
        } catch (error) {
            console.log('Legacy success haptic failed:', error);
        }
    },

    error: () => {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate([50, 20, 50]);
            }
        } catch (error) {
            console.log('Legacy error haptic failed:', error);
        }
    },

    warning: () => {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate([30, 10, 30]);
            }
        } catch (error) {
            console.log('Legacy warning haptic failed:', error);
        }
    }
};

// Check if we should use native haptics
const shouldUseNativeHaptics = () => {
    return PlatformDetection.isIOS();
};

// Initialize haptics system
let hapticsInitialized = false;
const initHaptics = async () => {
    if (!hapticsInitialized && shouldUseNativeHaptics()) {
        try {
            await initializeHaptics();
            hapticsInitialized = true;
            console.log('🍎 Native iOS haptics initialized');
        } catch (error) {
            console.log('Native haptics initialization failed, using fallback:', error);
        }
    }
};

// Auto-initialize on import
initHaptics();

/**
 * Enhanced Mobile Haptics with Native iOS Integration
 * Automatically uses native iOS haptics when available, falls back to web vibration
 */
export const MobileHaptics = {
    // Basic haptic feedback (light impact)
    light: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticImpact(HapticStyles.LIGHT);
        } else {
            legacyHaptics.light();
        }
    },

    // Medium haptic feedback (medium impact)
    medium: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticImpact(HapticStyles.MEDIUM);
        } else {
            legacyHaptics.medium();
        }
    },

    // Strong haptic feedback (heavy impact)
    heavy: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticImpact(HapticStyles.HEAVY);
        } else {
            legacyHaptics.heavy();
        }
    },

    // Success notification haptic
    success: async () => {
        if (shouldUseNativeHaptics()) {
            try {
                await hapticActionSuccess();
            } catch (error) {
                console.log('Native success haptic failed:', error);
                legacyHaptics.success();
            }
        } else {
            legacyHaptics.success();
        }
    },

    // Error notification haptic
    error: async () => {
        if (shouldUseNativeHaptics()) {
            try {
                await hapticActionError();
            } catch (error) {
                console.log('Native error haptic failed:', error);
                legacyHaptics.error();
            }
        } else {
            legacyHaptics.error();
        }
    },

    // Warning notification haptic
    warning: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticNotification(NotificationTypes.WARNING);
        } else {
            legacyHaptics.warning();
        }
    },

    // Selection change haptic (for tabs, toggles, etc.)
    selection: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticSelection();
        } else {
            legacyHaptics.light();
        }
    },

    // Enhanced app-specific haptic functions

    // Button tap haptic (optimized for button interactions)
    buttonTap: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticButtonTap();
        } else {
            legacyHaptics.light();
        }
    },

    // Form submission haptic
    formSubmit: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticFormSubmit();
        } else {
            legacyHaptics.medium();
        }
    },

    // Navigation change haptic
    navigationChange: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticNavigationChange();
        } else {
            legacyHaptics.light();
        }
    },

    // Modal interaction haptics
    modalOpen: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticModalOpen();
        } else {
            legacyHaptics.light();
        }
    },

    modalClose: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticModalClose();
        } else {
            legacyHaptics.light();
        }
    },

    // Inventory-specific haptic patterns

    // Item added to inventory (special success pattern)
    itemAdded: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticItemAdded();
        } else {
            legacyHaptics.success();
        }
    },

    // Item removed from inventory (heavy impact)
    itemRemoved: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticItemRemoved();
        } else {
            legacyHaptics.heavy();
        }
    },

    // Barcode scan successful (special success pattern)
    scanSuccess: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticScanSuccess();
        } else {
            // Triple tap pattern for scan success
            legacyHaptics.medium();
            setTimeout(() => legacyHaptics.light(), 50);
            setTimeout(() => legacyHaptics.light(), 100);
        }
    },

    // Barcode scan failed
    scanError: async () => {
        if (shouldUseNativeHaptics()) {
            await hapticScanError();
        } else {
            legacyHaptics.error();
        }
    },

    // Utility functions

    // Re-initialize haptics (useful for app lifecycle events)
    initialize: async () => {
        await initHaptics();
    },

    // Check if native haptics are being used
    isNative: () => {
        return shouldUseNativeHaptics() && hapticsInitialized;
    },

    // Check if any haptics are available
    isAvailable: () => {
        return shouldUseNativeHaptics() || ('vibrate' in navigator);
    },

    // Get haptic system info for debugging
    getInfo: () => {
        return {
            platform: PlatformDetection.getPlatformInfo(),
            native: shouldUseNativeHaptics(),
            initialized: hapticsInitialized,
            webVibration: 'vibrate' in navigator
        };
    },

    notificationSuccess: async () => {
        if (shouldUseNativeHaptics()) {
            try {
                await hapticNotification(NotificationTypes.SUCCESS);
            } catch (error) {
                console.log('Native success notification haptic failed:', error);
                legacyHaptics.success();
            }
        } else {
            legacyHaptics.success();
        }
    },

    // Notification-specific error haptic (missing method)
    notificationError: async () => {
        if (shouldUseNativeHaptics()) {
            try {
                await hapticNotification(NotificationTypes.ERROR);
            } catch (error) {
                console.log('Native error notification haptic failed:', error);
                legacyHaptics.error();
            }
        } else {
            legacyHaptics.error();
        }
    },
};

// Backward compatibility aliases
MobileHaptics.tap = MobileHaptics.light;
MobileHaptics.click = MobileHaptics.buttonTap;
MobileHaptics.feedback = MobileHaptics.selection;

// Auto-initialize when app becomes active (for iOS lifecycle)
if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && shouldUseNativeHaptics()) {
            initHaptics();
        }
    });
}

export default MobileHaptics;