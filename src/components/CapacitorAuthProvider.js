'use client'
// file: /src/components/providers/CapacitorAuthProvider.js - v2 - Fixed to exclude signout from redirects

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
                    // FIXED: Don't redirect signout requests - let them go to current domain
                    if (url.includes('/api/auth/signout') || url.includes('signout')) {
                        console.log('Allowing signout request to current domain:', url)
                        return originalFetch(url, options)
                    }

                    // Only redirect non-signout auth requests
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