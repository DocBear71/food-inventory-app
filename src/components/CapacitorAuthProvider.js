'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function CapacitorAuthProvider({ children }) {
    useEffect(() => {
        console.log('CapacitorAuthProvider mounted')

        if (Capacitor.isNativePlatform()) {
            console.log('Installing auth fetch override')

            const originalFetch = window.fetch

            window.fetch = function(url, options) {
                console.log('Fetch intercepted:', url)

                if (typeof url === 'string' && url.includes('/api/auth')) {
                    const newUrl = `https://www.docbearscomfort.kitchen${url}`
                    console.log(`Redirecting ${url} to ${newUrl}`)
                    return originalFetch(newUrl, options)
                }
                return originalFetch(url, options)
            }

            console.log('Auth override installed')
        }
    }, [])

    return children
}