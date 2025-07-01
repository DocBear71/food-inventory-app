'use client'
// file: /src/components/CapacitorAuthProvider.js - v3 - Fixed mobile sign-out by properly handling auth redirects

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function CapacitorAuthProvider({ children }) {
    useEffect(() => {
        console.log('CapacitorAuthProvider v3 started')

        if (Capacitor.isNativePlatform()) {
            console.log('Installing mobile auth override for native platform')

            const originalFetch = window.fetch

            window.fetch = function(url, options) {
                if (typeof url === 'string' && url.includes('/api/auth')) {
                    console.log('Auth request intercepted:', url, options?.method || 'GET')

                    // FIXED: Handle sign-out requests specially for mobile
                    if (url.includes('/api/auth/signout') || url.includes('signout')) {
                        console.log('Sign-out request detected - using local endpoint')

                        // For sign-out, always use the current domain to ensure proper session clearing
                        const currentOrigin = window.location.origin
                        const localUrl = url.startsWith('/') ? `${currentOrigin}${url}` : url

                        console.log('Sign-out URL:', localUrl)

                        // Ensure we're using POST for sign-out with proper headers
                        const signOutOptions = {
                            ...options,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                ...options?.headers
                            },
                            // Add credentials to ensure cookies are included
                            credentials: 'include'
                        }

                        return originalFetch(localUrl, signOutOptions)
                    }

                    // FIXED: Be more specific about which auth requests to redirect
                    // Only redirect sign-in related requests, not all auth requests
                    if (url.includes('/api/auth/signin') ||
                        url.includes('/api/auth/session') ||
                        url.includes('/api/auth/providers') ||
                        url.includes('/api/auth/callback')) {

                        const newUrl = `https://www.docbearscomfort.kitchen${url}`
                        console.log('Auth redirect for:', url, '→', newUrl)
                        return originalFetch(newUrl, {
                            ...options,
                            // Ensure credentials are included for auth requests
                            credentials: 'include'
                        })
                    }

                    // For other auth requests, use current domain
                    console.log('Using current domain for auth request:', url)
                    return originalFetch(url, options)
                }

                return originalFetch(url, options)
            }

            // ADDED: Override NextAuth signOut specifically for mobile
            if (typeof window !== 'undefined' && window.next) {
                console.log('Overriding NextAuth signOut for mobile')

                const originalSignOut = window.next?.auth?.signOut
                if (originalSignOut) {
                    window.next.auth.signOut = async function(options = {}) {
                        console.log('Mobile NextAuth signOut called with options:', options)

                        try {
                            // Force callbackUrl to current origin for mobile
                            const mobileOptions = {
                                ...options,
                                callbackUrl: options.callbackUrl || '/',
                                redirect: false // Always handle redirect manually on mobile
                            }

                            const result = await originalSignOut(mobileOptions)
                            console.log('Mobile signOut result:', result)

                            // Manual redirect for mobile
                            if (mobileOptions.callbackUrl && mobileOptions.callbackUrl !== window.location.href) {
                                console.log('Manually redirecting mobile user to:', mobileOptions.callbackUrl)
                                window.location.href = mobileOptions.callbackUrl
                            }

                            return result
                        } catch (error) {
                            console.error('Mobile NextAuth signOut error:', error)
                            // Fallback: clear storage and redirect
                            try {
                                localStorage.clear()
                                sessionStorage.clear()
                            } catch (storageError) {
                                console.error('Storage clear error:', storageError)
                            }
                            window.location.href = options.callbackUrl || '/'
                        }
                    }
                }
            }

            console.log('Mobile auth override installed successfully')
        } else {
            console.log('Not a native platform - skipping mobile auth override')
        }
    }, [])

    return children
}