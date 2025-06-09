// file: /src/components/mobile/MobileHaptics.js - Haptic feedback utility
'use client';

export class MobileHaptics {
    static isSupported() {
        return 'vibrate' in navigator;
    }

    static light() {
        if (this.isSupported()) {
            navigator.vibrate(10);
        }
    }

    static medium() {
        if (this.isSupported()) {
            navigator.vibrate(25);
        }
    }

    static heavy() {
        if (this.isSupported()) {
            navigator.vibrate([50, 25, 50]);
        }
    }

    static success() {
        if (this.isSupported()) {
            navigator.vibrate([25, 25, 25]);
        }
    }

    static error() {
        if (this.isSupported()) {
            navigator.vibrate([100, 50, 100, 50, 100]);
        }
    }

    static notification() {
        if (this.isSupported()) {
            navigator.vibrate([50, 100, 50]);
        }
    }
}