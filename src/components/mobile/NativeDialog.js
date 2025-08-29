'use client';
// file: /src/components/mobile/NativeDialog.js v1 - Native iOS dialog system

import { PlatformDetection } from '@/utils/PlatformDetection';

/**
 * Native iOS Dialog System
 * Provides native iOS action sheets, alerts, and confirmations
 * Falls back to web dialogs on non-iOS platforms
 */
export class NativeDialog {
    /**
     * Show native iOS alert dialog
     * @param {Object} options - Alert options
     * @param {string} options.title - Alert title
     * @param {string} options.message - Alert message
     * @param {string} [options.buttonText='OK'] - OK button text
     * @param {Function} [options.onConfirm] - Callback when OK is pressed
     */
    static async showAlert({ title, message, buttonText = 'OK', onConfirm }) {
        try {
            if (PlatformDetection.isIOS()) {
                // Use Capacitor Dialog plugin for native iOS alert
                const { Dialog } = await import('@capacitor/dialog');

                const result = await Dialog.alert({
                    title,
                    message
                });

                console.log('Native iOS alert shown:', title);

                if (onConfirm) {
                    onConfirm(result);
                }

                return result;
            } else {
                // Fallback to web alert for non-iOS
                const result = window.alert(`${title}\n\n${message}`);

                if (onConfirm) {
                    onConfirm({ confirmed: true });
                }

                return { confirmed: true };
            }
        } catch (error) {
            console.warn('Native alert failed, using web fallback:', error);

            const result = window.alert(`${title}\n\n${message}`);

            if (onConfirm) {
                onConfirm({ confirmed: true });
            }

            return { confirmed: true };
        }
    }

    /**
     * Show native iOS action sheet
     * @param {Object} options - Action sheet options
     * @param {string} options.title - Action sheet title
     * @param {string} [options.message] - Optional message
     * @param {Array} options.buttons - Array of button objects
     * @param {string} options.buttons[].text - Button text
     * @param {string} [options.buttons[].style] - Button style: 'default', 'destructive', 'cancel'
     * @param {Function} [options.buttons[].action] - Button callback function
     */
    static async showActionSheet({ title, message, buttons }) {
        try {
            if (PlatformDetection.isIOS()) {
                // Use Capacitor ActionSheet plugin for native iOS action sheet
                const { ActionSheet } = await import('@capacitor/action-sheet');

                // Separate regular buttons from cancel button
                const regularButtons = buttons.filter(b => b.style !== 'cancel');
                const cancelButton = buttons.find(b => b.style === 'cancel');

                const options = regularButtons.map(button => ({
                    title: button.text
                }));

                const result = await ActionSheet.showActions({
                    title,
                    message,
                    options,
                    cancelButtonTitle: cancelButton?.text || 'Cancel'
                });

                console.log('Native iOS action sheet result:', result);

                if (!result.cancelled && result.index !== undefined) {
                    const selectedButton = regularButtons[result.index];
                    if (selectedButton?.action) {
                        return selectedButton.action();
                    }
                    return selectedButton?.text;
                } else if (result.cancelled && cancelButton?.action) {
                    return cancelButton.action();
                }

                return null;
            } else {
                // Fallback to web confirm for non-iOS
                const buttonTexts = buttons.map(b => b.text).join('\n');
                const choice = window.confirm(`${title}\n\n${message || ''}\n\nOptions:\n${buttonTexts}`);

                if (choice && buttons[0]?.action) {
                    return buttons[0].action();
                }

                return null;
            }
        } catch (error) {
            console.warn('Native action sheet failed, using web fallback:', error);

            const buttonTexts = buttons.map(b => b.text).join('\n');
            const choice = window.confirm(`${title}\n\n${message || ''}\n\nOptions:\n${buttonTexts}`);

            if (choice && buttons[0]?.action) {
                return buttons[0].action();
            }

            return null;
        }
    }

    /**
     * Show native iOS confirmation dialog
     * @param {Object} options - Confirm options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Dialog message
     * @param {string} [options.okButtonTitle='OK'] - OK button text
     * @param {string} [options.cancelButtonTitle='Cancel'] - Cancel button text
     * @param {Function} [options.onConfirm] - Callback when confirmed
     * @param {Function} [options.onCancel] - Callback when cancelled
     */
    static async showConfirm({
                                 title,
                                 message,
                                 okButtonTitle = 'OK',
                                 cancelButtonTitle = 'Cancel',
                                 onConfirm,
                                 onCancel
                             }) {
        try {
            if (PlatformDetection.isIOS()) {
                // Use Capacitor Dialog plugin for native iOS confirm
                const { Dialog } = await import('@capacitor/dialog');

                const result = await Dialog.confirm({
                    title,
                    message,
                    okButtonTitle,
                    cancelButtonTitle
                });

                console.log('Native iOS confirm result:', result);

                if (result.value) {
                    if (onConfirm) onConfirm(result);
                } else {
                    if (onCancel) onCancel(result);
                }

                return result;
            } else {
                // Fallback to web confirm for non-iOS
                const choice = window.confirm(`${title}\n\n${message}`);
                const result = { value: choice };

                if (choice) {
                    if (onConfirm) onConfirm(result);
                } else {
                    if (onCancel) onCancel(result);
                }

                return result;
            }
        } catch (error) {
            console.warn('Native confirm failed, using web fallback:', error);

            const choice = window.confirm(`${title}\n\n${message}`);
            const result = { value: choice };

            if (choice) {
                if (onConfirm) onConfirm(result);
            } else {
                if (onCancel) onCancel(result);
            }

            return result;
        }
    }

    /**
     * Show error dialog with appropriate styling
     * @param {Object} options - Error dialog options
     * @param {string} options.title - Error title
     * @param {string} options.message - Error message
     * @param {Function} [options.onAcknowledge] - Callback when acknowledged
     */
    static async showError({ title = 'Error', message, onAcknowledge }) {
        return this.showAlert({
            title,
            message,
            buttonText: 'OK',
            onConfirm: onAcknowledge
        });
    }

    /**
     * Show success dialog with appropriate styling
     * @param {Object} options - Success dialog options
     * @param {string} options.title - Success title
     * @param {string} options.message - Success message
     * @param {Function} [options.onAcknowledge] - Callback when acknowledged
     */
    static async showSuccess({ title = 'Success', message, onAcknowledge }) {
        return this.showAlert({
            title,
            message,
            buttonText: 'OK',
            onConfirm: onAcknowledge
        });
    }

    /**
     * Show upgrade prompt action sheet
     * @param {Object} options - Upgrade prompt options
     * @param {string} options.feature - Feature name requiring upgrade
     * @param {string} [options.tier='Gold'] - Required tier
     * @param {string} [options.currentLimit] - Current usage limit info
     */
    static async showUpgradePrompt({ feature, tier = 'Gold', currentLimit }) {
        const title = `${feature} Limit Reached`;
        const message = currentLimit
            ? `${currentLimit}\n\nUpgrade to ${tier} for unlimited access to ${feature}.`
            : `Upgrade to ${tier} for unlimited access to ${feature}.`;

        return this.showActionSheet({
            title,
            message,
            buttons: [
                {
                    text: `Upgrade to ${tier}`,
                    style: 'default',
                    action: () => {
                        window.location.href = `/pricing?source=${feature.toLowerCase().replace(/\s+/g, '-')}&feature=${feature.toLowerCase().replace(/\s+/g, '-')}&required=${tier.toLowerCase()}`;
                        return 'upgrade';
                    }
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                    action: () => 'cancel'
                }
            ]
        });
    }

    /**
     * Show verification required dialog
     * @param {Object} options - Verification dialog options
     * @param {string} [options.email] - Email address
     * @param {Function} [options.onResend] - Callback to resend verification
     */
    static async showVerificationRequired({ email, onResend }) {
        const message = email
            ? `Please verify your email address (${email}) before continuing. Check your inbox and spam folder.`
            : 'Please verify your email address before continuing.';

        const buttons = [
            {
                text: 'Check Email',
                style: 'default',
                action: () => 'check'
            }
        ];

        if (onResend) {
            buttons.push({
                text: 'Resend Verification',
                style: 'default',
                action: () => {
                    onResend();
                    return 'resend';
                }
            });
        }

        buttons.push({
            text: 'Cancel',
            style: 'cancel',
            action: () => 'cancel'
        });

        return this.showActionSheet({
            title: 'Email Verification Required',
            message,
            buttons
        });
    }

    /**
     * Check if native dialogs are available
     * @returns {boolean} True if native dialogs are available
     */
    static isNativeAvailable() {
        return PlatformDetection.isIOS();
    }

    /**
     * Get platform info for debugging
     * @returns {Object} Platform information
     */
    static getPlatformInfo() {
        return {
            isIOS: PlatformDetection.isIOS(),
            platformInfo: PlatformDetection.getPlatformInfo(),
            nativeDialogsAvailable: this.isNativeAvailable()
        };
    }
}

export default NativeDialog;