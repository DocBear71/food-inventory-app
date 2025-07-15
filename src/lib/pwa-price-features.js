// file: /src/lib/pwa-price-features.js
// ==============================================================================

// PWA-specific price tracking enhancements
export class PWAPriceFeatures {
    static async enableOfflineSupport() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                console.log('PWA price tracking features enabled');
                return true;
            } catch (error) {
                console.error('PWA features not available:', error);
                return false;
            }
        }
        return false;
    }

    static async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    static async showPriceAlert(itemName, newPrice, oldPrice, store) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`💰 Price Drop: ${itemName}`, {
                body: `Now $${newPrice} (was $${oldPrice}) at ${store}`,
                icon: '/icons/price-alert.png',
                badge: '/icons/badge.png',
                tag: 'price-alert',
                renotify: true,
                requireInteraction: true,
                actions: [
                    { action: 'view', title: 'View Item' },
                    { action: 'dismiss', title: 'Dismiss' }
                ]
            });

            notification.onclick = () => {
                window.focus();
                window.location.href = '/inventory?tab=analytics';
                notification.close();
            };

            return notification;
        }
        return null;
    }

    static async vibratePriceAlert() {
        if ('vibrate' in navigator) {
            // Custom vibration pattern for price alerts
            navigator.vibrate([200, 100, 200]);
        }
    }

    static async sharePrice(itemName, price, store) {
        if ('share' in navigator) {
            try {
                await navigator.share({
                    title: `Great Price: ${itemName}`,
                    text: `Found ${itemName} for $${price} at ${store}`,
                    url: window.location.href
                });
                return true;
            } catch (error) {
                console.log('Share not available:', error);
                return false;
            }
        }
        return false;
    }

    static async addToWallet(itemName, price, store) {
        // Future: Add price tracking reminders to device wallet/calendar
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            // Background sync for price checking
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('price-check');
            return true;
        }
        return false;
    }
}