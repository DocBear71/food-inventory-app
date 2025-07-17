// file: /public/sw.js v2 - Enhanced Service Worker for Doc Bear's Comfort Kitchen with Voice & Price Intelligence

const CACHE_NAME = 'comfort-kitchen-v1.3.0';
const CACHE_NAMES = {
    STATIC: 'comfort-kitchen-static-v1.3.0',
    API: 'comfort-kitchen-api-v1.3.0',
    IMAGES: 'comfort-kitchen-images-v1.3.0',
    VOICE: 'comfort-kitchen-voice-v1.3.0',
    PRICE: 'comfort-kitchen-price-v1.3.0'
};

const STATIC_CACHE_URLS = [
    '/',
    '/inventory',
    '/recipes',
    '/meal-planning',
    '/shopping-lists',
    '/price-tracking',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/offline.html' // Fallback page
];

// NEW: Voice-related resources to cache
const VOICE_CACHE_URLS = [
    '/voice-commands.json',
    '/voice-help.html'
];

// NEW: Price intelligence resources to cache
const PRICE_CACHE_URLS = [
    '/price-data-fallback.json',
    '/store-locations.json'
];

// Install event - Enhanced caching strategy
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');

    event.waitUntil(
        Promise.all([
            // Cache static resources
            caches.open(CACHE_NAMES.STATIC).then((cache) => {
                console.log('📦 Caching static resources...');
                return cache.addAll(STATIC_CACHE_URLS);
            }),

            // Cache voice resources
            caches.open(CACHE_NAMES.VOICE).then((cache) => {
                console.log('🎤 Caching voice resources...');
                return cache.addAll(VOICE_CACHE_URLS).catch(() => {
                    console.log('⚠️ Some voice resources not found - continuing...');
                });
            }),

            // Cache price intelligence resources
            caches.open(CACHE_NAMES.PRICE).then((cache) => {
                console.log('💰 Caching price intelligence resources...');
                return cache.addAll(PRICE_CACHE_URLS).catch(() => {
                    console.log('⚠️ Some price resources not found - continuing...');
                });
            })
        ]).then(() => {
            console.log('✅ Service Worker installation complete');
            return self.skipWaiting();
        })
    );
});

// Activate event - Enhanced cleanup
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activating...');

    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (!Object.values(CACHE_NAMES).includes(cacheName)) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),

            // Claim all clients
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker activation complete');
        })
    );
});

// Enhanced fetch strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests for caching
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests
    if (!request.url.startsWith(self.location.origin)) {
        return;
    }

    // API calls - Enhanced Network First with smart caching
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Images - Cache First with network fallback
    if (request.destination === 'image') {
        event.respondWith(handleImageRequest(request));
        return;
    }

    // Static assets - Cache First
    if (request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'font' ||
        STATIC_CACHE_URLS.includes(url.pathname)) {
        event.respondWith(handleStaticRequest(request));
        return;
    }

    // Navigation requests - Network First with enhanced offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigationRequest(request));
        return;
    }

    // Default: Network First with cache fallback
    event.respondWith(handleDefaultRequest(request));
});

// NEW: Enhanced API request handling
async function handleApiRequest(request) {
    const url = new URL(request.url);

    try {
        // Always try network first for APIs
        const response = await fetch(request);

        // Cache successful GET responses for specific endpoints
        if (response.ok && shouldCacheApiResponse(url.pathname)) {
            const cache = await caches.open(CACHE_NAMES.API);
            // Clone response before caching
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log('🌐 API request failed, trying cache:', url.pathname);

        // Try to get cached response
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('📦 Serving cached API response');
            return cachedResponse;
        }

        // Return offline response for critical endpoints
        return createOfflineApiResponse(url.pathname);
    }
}

// NEW: Determine if API response should be cached
function shouldCacheApiResponse(pathname) {
    const cacheableEndpoints = [
        '/api/recipes',
        '/api/inventory',
        '/api/stores',
        '/api/user/preferences',
        '/api/price-tracking/deals'
    ];

    return cacheableEndpoints.some(endpoint => pathname.startsWith(endpoint));
}

// NEW: Create offline API responses
function createOfflineApiResponse(pathname) {
    const offlineData = {
        success: false,
        error: 'Offline - data not available',
        offline: true,
        pathname
    };

    // Provide fallback data for critical endpoints
    if (pathname.startsWith('/api/inventory')) {
        return new Response(JSON.stringify({
            success: true,
            inventory: [],
            offline: true,
            message: 'Showing cached inventory data'
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });
    }

    if (pathname.startsWith('/api/price-tracking/deals')) {
        return new Response(JSON.stringify({
            success: true,
            deals: [],
            offline: true,
            message: 'Price data unavailable offline'
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });
    }

    return new Response(JSON.stringify(offlineData), {
        headers: { 'Content-Type': 'application/json' },
        status: 503
    });
}

// NEW: Enhanced image request handling
async function handleImageRequest(request) {
    try {
        const cache = await caches.open(CACHE_NAMES.IMAGES);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Return placeholder image for failed requests
        return new Response('', { status: 404 });
    }
}

// NEW: Enhanced static request handling
async function handleStaticRequest(request) {
    try {
        const cache = await caches.open(CACHE_NAMES.STATIC);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return new Response('Resource not available offline', { status: 404 });
    }
}

// NEW: Enhanced navigation request handling
async function handleNavigationRequest(request) {
    try {
        return await fetch(request);
    } catch (error) {
        console.log('🌐 Navigation request failed, serving offline page');

        // Try to serve cached page first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Serve offline page
        const offlinePage = await caches.match('/offline.html');
        if (offlinePage) {
            return offlinePage;
        }

        // Last resort - serve root page
        const rootPage = await caches.match('/');
        return rootPage || new Response('App offline', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// NEW: Default request handling
async function handleDefaultRequest(request) {
    try {
        const response = await fetch(request);

        // Cache successful responses
        if (response.ok) {
            const cache = await caches.open(CACHE_NAMES.STATIC);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('Not available offline', { status: 404 });
    }
}

// Enhanced background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);

    switch (event.tag) {
        case 'inventory-sync':
            event.waitUntil(syncInventoryData());
            break;
        case 'shopping-sync':
            event.waitUntil(syncShoppingData());
            break;
        case 'recipe-sync':
            event.waitUntil(syncRecipeData());
            break;
        case 'price-sync':
            event.waitUntil(syncPriceData());
            break;
        case 'voice-commands-sync':
            event.waitUntil(syncVoiceCommands());
            break;
    }
});

// NEW: Enhanced sync functions
async function syncInventoryData() {
    console.log('📦 Syncing inventory data...');
    const offlineActions = await getOfflineActions('inventory');
    await processOfflineActions(offlineActions);
}

async function syncShoppingData() {
    console.log('🛒 Syncing shopping data...');
    const offlineActions = await getOfflineActions('shopping');
    await processOfflineActions(offlineActions);
}

async function syncRecipeData() {
    console.log('📝 Syncing recipe data...');
    const offlineActions = await getOfflineActions('recipes');
    await processOfflineActions(offlineActions);
}

async function syncPriceData() {
    console.log('💰 Syncing price data...');
    const offlineActions = await getOfflineActions('price-tracking');
    await processOfflineActions(offlineActions);
}

async function syncVoiceCommands() {
    console.log('🎤 Syncing voice commands...');
    const offlineActions = await getOfflineActions('voice');
    await processOfflineActions(offlineActions);
}

async function processOfflineActions(actions) {
    for (const action of actions) {
        try {
            const response = await fetch(action.url, {
                method: action.method,
                headers: action.headers,
                body: action.body
            });

            if (response.ok) {
                await removeOfflineAction(action.id);
                console.log('✅ Synced action:', action.id);

                // Notify clients of successful sync
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SYNC_SUCCESS',
                        data: action
                    });
                });
            }
        } catch (error) {
            console.error('❌ Sync failed for action:', action.id, error);
        }
    }
}

async function getOfflineActions(type = null) {
    // In a real implementation, this would read from IndexedDB
    // For now, return empty array
    return [];
}

async function removeOfflineAction(id) {
    // In a real implementation, this would remove from IndexedDB
    console.log('🗑️ Removing synced action:', id);
}

// Enhanced push notifications with voice and price intelligence
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();

    // Enhanced notification options based on type
    let options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: data.tag || 'comfort-kitchen',
        requireInteraction: data.requireInteraction || false,
        vibrate: [200, 100, 200], // Enhanced vibration pattern
        data: data.data || {}
    };

    // Customize based on notification type
    switch (data.type) {
        case 'price-alert':
            options.actions = [
                { action: 'view-deal', title: '💰 View Deal', icon: '/icons/deal-action.png' },
                { action: 'add-to-list', title: '➕ Add to List', icon: '/icons/add-action.png' }
            ];
            options.vibrate = [100, 50, 100, 50, 100]; // Deal alert pattern
            break;

        case 'inventory-expiry':
            options.actions = [
                { action: 'view-inventory', title: '📦 View Items', icon: '/icons/inventory-action.png' },
                { action: 'plan-meal', title: '🍽️ Plan Meal', icon: '/icons/meal-action.png' }
            ];
            break;

        case 'voice-tip':
            options.actions = [
                { action: 'try-voice', title: '🎤 Try Voice', icon: '/icons/voice-action.png' },
                { action: 'learn-more', title: '📖 Learn More', icon: '/icons/help-action.png' }
            ];
            break;

        default:
            options.actions = [
                { action: 'open-app', title: '📱 Open App', icon: '/icons/app-action.png' }
            ];
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Doc Bear\'s Comfort Kitchen', options)
    );
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const action = event.action;
    const notificationData = event.notification.data;

    let targetUrl = '/';

    // Handle specific actions
    switch (action) {
        case 'view-deal':
            targetUrl = `/price-tracking?deal=${notificationData.dealId || ''}`;
            break;
        case 'add-to-list':
            targetUrl = `/shopping?add=${notificationData.itemId || ''}`;
            break;
        case 'view-inventory':
            targetUrl = '/inventory';
            break;
        case 'plan-meal':
            targetUrl = `/meal-planning?use=${notificationData.itemId || ''}`;
            break;
        case 'try-voice':
            targetUrl = '/inventory?voice=true';
            break;
        case 'learn-more':
            targetUrl = '/help/voice-commands';
            break;
        case 'open-app':
        default:
            targetUrl = notificationData.url || '/';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Try to focus existing window
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }

            // Open new window if none exists
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// NEW: Handle skip waiting message
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('🐻 Doc Bear\'s Comfort Kitchen Service Worker v1.3.0 loaded with Voice & Price Intelligence support!');