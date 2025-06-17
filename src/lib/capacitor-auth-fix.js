// file: src/lib/capacitor-auth-fix.js v2

import { Capacitor } from '@capacitor/core'

console.log('Auth fix file loaded')

// Run immediately when the file loads
if (typeof window !== 'undefined') {
    console.log('Window is available')

    // Wait for Capacitor to be ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, checking Capacitor')

        if (Capacitor.isNativePlatform()) {
            console.log('Is native platform, installing fetch override')

            const originalFetch = window.fetch

            window.fetch = function(url, options) {
                console.log('Fetch called with:', url)

                if (typeof url === 'string' && url.includes('/api/auth')) {
                    const newUrl = `https://www.docbearscomfort.kitchen${url}`
                    console.log(`Redirecting auth call from ${url} to ${newUrl}`)
                    return originalFetch(newUrl, options)
                }
                return originalFetch(url, options)
            }

            console.log('Fetch override installed')
        } else {
            console.log('Not native platform')
        }
    })
} else {
    console.log('Window not available')
}