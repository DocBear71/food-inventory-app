'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function CapacitorAuthProvider({ children }) {
    useEffect(() => {
        // Try multiple ways to log for debugging
        console.log('CapacitorAuthProvider started')

        if (Capacitor.isNativePlatform()) {
            console.log('Installing mobile auth override')

            const originalFetch = window.fetch

            window.fetch = function(url, options) {
                if (typeof url === 'string' && url.includes('/api/auth')) {
                    const newUrl = `https://www.docbearscomfort.kitchen${url}`
                    // Log for debugging in emulator
                    console.log('Auth redirect:', url, '→', newUrl)
                    return originalFetch(newUrl, options)
                }
                return originalFetch(url, options)
            }

            console.log('Mobile auth override installed')
        }
    }, [])

    return children
}