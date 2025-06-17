'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function CapacitorAuthProvider({ children }) {
    useEffect(() => {
        // Only install auth override for mobile apps
        if (Capacitor.isNativePlatform()) {
            const originalFetch = window.fetch

            window.fetch = function(url, options) {
                if (typeof url === 'string' && url.includes('/api/auth')) {
                    const newUrl = `https://www.docbearscomfort.kitchen${url}`
                    return originalFetch(newUrl, options)
                }
                return originalFetch(url, options)
            }
        }
    }, [])

    return children
}