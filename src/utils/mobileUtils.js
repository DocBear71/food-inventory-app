// file: /src/utils/mobileUtils.js - Mobile utility functions
export const MobileUtils = {
    // Prevent body scroll when modal is open
    lockBodyScroll: () => {
        if (typeof window !== 'undefined') {
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';
        }
    },

    // Re-enable body scroll
    unlockBodyScroll: () => {
        if (typeof window !== 'undefined') {
            document.body.style.overflow = '';
            document.body.style.height = '';
        }
    },

    // Check if device is iOS
    isIOS: () => {
        if (typeof window === 'undefined') return false;
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    },

    // Check if PWA is installed
    isPWAInstalled: () => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;
    },

    // Get safe area insets for devices with notches
    getSafeAreaInsets: () => {
        if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };

        const computedStyle = getComputedStyle(document.documentElement);
        return {
            top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0,
            bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
            left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 0,
            right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 0
        };
    },

    // Smooth scroll to element
    scrollToElement: (elementId, offset = 0) => {
        if (typeof window === 'undefined') return;

        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.offsetTop - offset;
            window.scrollTo({
                top: elementPosition,
                behavior: 'smooth'
            });
        }
    }
};