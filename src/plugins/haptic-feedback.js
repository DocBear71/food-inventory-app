// file: /src/plugins/haptic-feedback.js v1 - JavaScript interface for iOS haptic feedback

import { registerPlugin } from '@capacitor/core';
import { PlatformDetection } from '@/utils/PlatformDetection';

/**
 * Native Haptic Feedback Plugin Interface
 * Provides access to native iOS haptic feedback with graceful fallbacks
 */
const HapticFeedback = registerPlugin('HapticFeedback', {
    web: () => import('./haptic-feedback.web').then(m => new m.HapticFeedbackWeb()),
});

/**
 * Haptic feedback styles for impact feedback
 */
export const HapticStyles = {
    LIGHT: 'light',
    MEDIUM: 'medium',
    HEAVY: 'heavy'
};

/**
 * Notification haptic types
 */
export const NotificationTypes = {
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

/**
 * Check if haptic feedback is available on current device
 * @returns {Promise<boolean>} True if haptic feedback is available
 */
export const isHapticAvailable = async () => {
    try {
        const result = await HapticFeedback.isAvailable();
        return result.available;
    } catch (error) {
        console.log('Haptic availability check failed:', error);
        return false;
    }
};

/**
 * Prepare haptic generators for immediate response
 * Call this when your app becomes active for best performance
 */
export const prepareHaptics = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.prepare();
            console.log('🍎 Haptic generators prepared');
        }
    } catch (error) {
        console.log('Haptic preparation failed:', error);
    }
};

/**
 * Trigger impact haptic feedback
 * @param {string} style - Impact style: 'light', 'medium', or 'heavy'
 */
export const hapticImpact = async (style = HapticStyles.MEDIUM) => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.impact({ style });
        }
    } catch (error) {
        console.log('Haptic impact failed:', error);
    }
};

/**
 * Trigger notification haptic feedback
 * @param {string} type - Notification type: 'success', 'warning', or 'error'
 */
export const hapticNotification = async (type = NotificationTypes.SUCCESS) => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.notification({ type });
        }
    } catch (error) {
        console.log('Haptic notification failed:', error);
    }
};

/**
 * Trigger selection haptic feedback
 * Used for UI element selection changes
 */
export const hapticSelection = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.selection();
        }
    } catch (error) {
        console.log('Haptic selection failed:', error);
    }
};

/**
 * Basic vibration (fallback for older devices)
 * @param {number} duration - Vibration duration in milliseconds
 */
export const hapticVibrate = async (duration = 500) => {
    try {
        await HapticFeedback.vibrate({ duration });
    } catch (error) {
        console.log('Haptic vibration failed:', error);
    }
};

// ==========================================
// App-Specific Haptic Functions
// ==========================================

/**
 * Haptic feedback for button taps
 * Light impact for general button interactions
 */
export const hapticButtonTap = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.buttonTap();
        }
    } catch (error) {
        console.log('Button tap haptic failed:', error);
    }
};

/**
 * Haptic feedback for successful actions
 * Success notification for completed actions
 */
export const hapticActionSuccess = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.actionSuccess();
        }
    } catch (error) {
        console.log('Action success haptic failed:', error);
    }
};

/**
 * Haptic feedback for errors
 * Error notification for failed actions
 */
export const hapticActionError = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.actionError();
        }
    } catch (error) {
        console.log('Action error haptic failed:', error);
    }
};

/**
 * Haptic feedback for form submissions
 * Medium impact for form submit actions
 */
export const hapticFormSubmit = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.formSubmit();
        }
    } catch (error) {
        console.log('Form submit haptic failed:', error);
    }
};

/**
 * Haptic feedback for navigation changes
 * Selection feedback for page/tab changes
 */
export const hapticNavigationChange = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.navigationChange();
        }
    } catch (error) {
        console.log('Navigation change haptic failed:', error);
    }
};

/**
 * Haptic feedback for modal opening
 * Light impact for modal presentations
 */
export const hapticModalOpen = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.modalOpen();
        }
    } catch (error) {
        console.log('Modal open haptic failed:', error);
    }
};

/**
 * Haptic feedback for modal closing
 * Light impact for modal dismissals
 */
export const hapticModalClose = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.modalClose();
        }
    } catch (error) {
        console.log('Modal close haptic failed:', error);
    }
};

// ==========================================
// Inventory-Specific Haptic Functions
// ==========================================

/**
 * Haptic feedback for adding inventory items
 * Double tap pattern for successful item addition
 */
export const hapticItemAdded = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.itemAdded();
        }
    } catch (error) {
        console.log('Item added haptic failed:', error);
    }
};

/**
 * Haptic feedback for removing inventory items
 * Heavy impact for item removal
 */
export const hapticItemRemoved = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.itemRemoved();
        }
    } catch (error) {
        console.log('Item removed haptic failed:', error);
    }
};

/**
 * Haptic feedback for successful barcode scans
 * Special pattern for scan success
 */
export const hapticScanSuccess = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.scanSuccess();
        }
    } catch (error) {
        console.log('Scan success haptic failed:', error);
    }
};

/**
 * Haptic feedback for barcode scan errors
 * Error notification for scan failures
 */
export const hapticScanError = async () => {
    try {
        if (PlatformDetection.isIOS()) {
            await HapticFeedback.scanError();
        }
    } catch (error) {
        console.log('Scan error haptic failed:', error);
    }
};

// ==========================================
// Convenience Functions
// ==========================================

/**
 * Initialize haptic feedback system
 * Call this when your app starts or becomes active
 */
export const initializeHaptics = async () => {
    try {
        const available = await isHapticAvailable();
        if (available) {
            await prepareHaptics();
            console.log('🍎 Haptic feedback system initialized');
            return true;
        } else {
            console.log('📱 Haptic feedback not available on this device');
            return false;
        }
    } catch (error) {
        console.log('Haptic initialization failed:', error);
        return false;
    }
};

/**
 * Quick haptic feedback based on action type
 * @param {string} action - Action type (button, success, error, etc.)
 */
export const hapticQuick = async (action) => {
    switch (action) {
        case 'button':
        case 'tap':
            await hapticButtonTap();
            break;
        case 'success':
            await hapticActionSuccess();
            break;
        case 'error':
            await hapticActionError();
            break;
        case 'warning':
            await hapticNotification(NotificationTypes.WARNING);
            break;
        case 'selection':
            await hapticSelection();
            break;
        case 'navigation':
            await hapticNavigationChange();
            break;
        case 'form':
            await hapticFormSubmit();
            break;
        case 'modal-open':
            await hapticModalOpen();
            break;
        case 'modal-close':
            await hapticModalClose();
            break;
        case 'item-added':
            await hapticItemAdded();
            break;
        case 'item-removed':
            await hapticItemRemoved();
            break;
        case 'scan-success':
            await hapticScanSuccess();
            break;
        case 'scan-error':
            await hapticScanError();
            break;
        default:
            await hapticButtonTap();
            break;
    }
};

export default HapticFeedback;