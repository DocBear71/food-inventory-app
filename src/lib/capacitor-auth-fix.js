import { Capacitor } from '@capacitor/core'

// Only run this in the browser and when in a Capacitor app
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    // Store the original fetch
    const originalFetch = window.fetch

    // Override fetch to redirect auth calls to your live server
    window.fetch = function(url, options) {
        if (typeof url === 'string' && url.startsWith('/api/auth')) {
            const newUrl = `https://www.docbearscomfort.kitchen${url}`
            console.log(`Redirecting auth call from ${url} to ${newUrl}`)
            return originalFetch(newUrl, options)
        }
        return originalFetch(url, options)
    }

    console.log('Capacitor auth fetch override installed')
}