// file: /src/lib/offline-price-storage.js
// ==============================================================================

// Offline storage for price tracking when internet is unavailable
export class OfflinePriceStorage {
    static DB_NAME = 'ComfortKitchenPrices';
    static DB_VERSION = 1;
    static STORE_NAME = 'pendingPrices';

    static async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('itemId', 'itemId', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    static async savePriceOffline(itemId, priceData) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);

            const offlinePrice = {
                itemId,
                ...priceData,
                timestamp: Date.now(),
                synced: false
            };

            await store.add(offlinePrice);
            console.log('💾 Price saved offline:', offlinePrice);

            return true;
        } catch (error) {
            console.error('Failed to save price offline:', error);
            return false;
        }
    }

    static async getPendingPrices() {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const pending = request.result.filter(price => !price.synced);
                    resolve(pending);
                };
            });
        } catch (error) {
            console.error('Failed to get pending prices:', error);
            return [];
        }
    }

    static async syncPendingPrices() {
        try {
            const pendingPrices = await this.getPendingPrices();
            let synced = 0;

            for (const price of pendingPrices) {
                try {
                    const response = await fetch(`/api/inventory/${price.itemId}/prices`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            price: price.price,
                            store: price.store,
                            size: price.size,
                            unit: price.unit,
                            isOnSale: price.isOnSale,
                            notes: price.notes + ' (synced from offline)'
                        })
                    });

                    if (response.ok) {
                        await this.markAsSynced(price.id);
                        synced++;
                    }
                } catch (error) {
                    console.error('Failed to sync price:', price.id, error);
                }
            }

            console.log(`📡 Synced ${synced}/${pendingPrices.length} offline prices`);
            return synced;
        } catch (error) {
            console.error('Sync failed:', error);
            return 0;
        }
    }

    static async markAsSynced(priceId) {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);

            const price = await store.get(priceId);
            if (price) {
                price.synced = true;
                price.syncedAt = Date.now();
                await store.put(price);
            }
        } catch (error) {
            console.error('Failed to mark as synced:', error);
        }
    }

    static async clearSyncedPrices() {
        try {
            const db = await this.initDB();
            const transaction = db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);

            const syncedPrices = await store.getAll();
            const toDelete = syncedPrices.filter(price => price.synced);

            for (const price of toDelete) {
                await store.delete(price.id);
            }

            console.log(`🗑️ Cleared ${toDelete.length} synced prices`);
        } catch (error) {
            console.error('Failed to clear synced prices:', error);
        }
    }
}