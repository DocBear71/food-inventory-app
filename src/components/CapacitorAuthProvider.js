'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function CapacitorAuthProvider({ children }) {
    // Log immediately when component renders
    console.log('CapacitorAuthProvider rendering now!')

    useEffect(() => {
        // Add an alert so we can see this for sure
        alert('CapacitorAuthProvider mounted - check console!')

        console.log('=== CapacitorAuthProvider useEffect ===')
        console.log('Window available:', typeof window !== 'undefined')
        console.log('Capacitor available:', typeof Capacitor !== 'undefined')

        if (typeof Capacitor !== 'undefined') {
            console.log('Platform:', Capacitor.getPlatform())
            console.log('Is native:', Capacitor.isNativePlatform())
        }

        // Install fetch override regardless of platform for testing
        if (typeof window !== 'undefined' && window.fetch) {
            console.log('Installing fetch override...')

            const originalFetch = window.fetch

            window.fetch = function(url, options) {
                console.log('FETCH CALL:', url)

                if (typeof url === 'string' && url.includes('/api/auth')) {
                    const newUrl = `https://www.docbearscomfort.kitchen${url}`
                    console.log('REDIRECTING AUTH:', url, 'to', newUrl)
                    return originalFetch(newUrl, options)
                }

                return originalFetch(url, options)
            }

            console.log('Fetch override complete!')
        }
    }, [])

    return <>{children}</>
}