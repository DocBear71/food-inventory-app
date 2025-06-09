// file: /public/sw.js - Service Worker for PWA
const CACHE_NAME = 'food-inventory-v1';
const STATIC_CACHE_URLS = [
    '/',
    '/inventory',
    '/recipes',
    '/meal-planning',
    '/shopping-lists',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_CACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - Network First strategy for API calls, Cache First for static assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API calls - Network First
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful GET requests
                    if (request.method === 'GET' && response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache for GET requests
                    if (request.method === 'GET') {
                        return caches.match(request);
                    }
                    return new Response('Offline', { status: 503 });
                })
        );
        return;
    }

    // Static assets - Cache First
    if (request.destination === 'image' ||
        request.destination === 'script' ||
        request.destination === 'style' ||
        STATIC_CACHE_URLS.includes(url.pathname)) {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    return response || fetch(request).then((fetchResponse) => {
                        const responseClone = fetchResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                        return fetchResponse;
                    });
                })
        );
        return;
    }

    // Navigation requests - Network First with fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match('/') || new Response('Offline', {
                        status: 503,
                        headers: { 'Content-Type': 'text/html' }
                    });
                })
        );
        return;
    }

    // Default: try network first, then cache
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'inventory-sync') {
        event.waitUntil(syncInventoryData());
    }
});

async function syncInventoryData() {
    // Implement offline sync logic here
    const offlineActions = await getOfflineActions();

    for (const action of offlineActions) {
        try {
            await fetch(action.url, {
                method: action.method,
                headers: action.headers,
                body: action.body
            });
            await removeOfflineAction(action.id);
        } catch (error) {
            console.error('Sync failed for action:', action);
        }
    }
}

async function getOfflineActions() {
    // Get offline actions from IndexedDB
    return [];
}

async function removeOfflineAction(id) {
    // Remove synced action from IndexedDB
}

// Push notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: data.tag || 'food-inventory',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action) {
        // Handle action buttons
        switch (event.action) {
            case 'view':
                event.waitUntil(clients.openWindow('/inventory'));
                break;
            case 'add':
                event.waitUntil(clients.openWindow('/inventory?action=add'));
                break;
        }
    } else {
        // Default click action
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});