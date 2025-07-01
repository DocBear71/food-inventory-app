'use client'

// file: /src/components/providers/CapacitorAuthProvider.js - v4 - Enhanced mobile auth flow

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function CapacitorAuthProvider({ children }) {
    useEffect(() => {
        console.log('CapacitorAuthProvider v4 started')

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

                    // ENHANCED: Handle successful sign-in redirects
                    if (url.includes('/api/auth/callback') || url.includes('/api/auth/signin')) {
                        const newUrl = `https://www.docbearscomfort.kitchen${url}`
                        console.log('Auth callback/signin redirect:', url, '→', newUrl)

                        return originalFetch(newUrl, {
                            ...options,
                            credentials: 'include'
                        }).then(response => {
                            console.log('Auth response status:', response.status);

                            // If successful and it's a callback, redirect to dashboard
                            if (response.ok && url.includes('/callback')) {
                                console.log('Successful auth callback - redirecting to dashboard');
                                setTimeout(() => {
                                    window.location.href = '/dashboard';
                                }, 1000);
                            }

                            return response;
                        });
                    }

                    // FIXED: Be more specific about which auth requests to redirect
                    // Only redirect session and provider requests
                    if (url.includes('/api/auth/session') || url.includes('/api/auth/providers')) {
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

            // ENHANCED: Override NextAuth signOut and signIn for mobile
            if (typeof window !== 'undefined') {
                // Wait for NextAuth to be available
                const setupNextAuthOverrides = () => {
                    if (window.next?.auth) {
                        console.log('Setting up NextAuth overrides for mobile')

                        // Override signOut
                        const originalSignOut = window.next.auth.signOut
                        if (originalSignOut) {
                            window.next.auth.signOut = async function(options = {}) {
                                console.log('Mobile NextAuth signOut called')
                                try {
                                    const result = await originalSignOut({
                                        ...options,
                                        callbackUrl: '/',
                                        redirect: false
                                    })
                                    console.log('Mobile signOut result:', result)
                                    window.location.href = '/'
                                    return result
                                } catch (error) {
                                    console.error('Mobile signOut error:', error)
                                    window.location.href = '/'
                                }
                            }
                        }

                        // Override signIn to handle redirects
                        const originalSignIn = window.next.auth.signIn
                        if (originalSignIn) {
                            window.next.auth.signIn = async function(provider, options = {}) {
                                console.log('Mobile NextAuth signIn called for provider:', provider)
                                try {
                                    const result = await originalSignIn(provider, {
                                        ...options,
                                        callbackUrl: '/dashboard',
                                        redirect: false
                                    })
                                    console.log('Mobile signIn result:', result)

                                    // If successful, redirect to dashboard
                                    if (result?.ok) {
                                        setTimeout(() => {
                                            window.location.href = '/dashboard'
                                        }, 1000)
                                    }

                                    return result
                                } catch (error) {
                                    console.error('Mobile signIn error:', error)
                                    throw error
                                }
                            }
                        }
                    } else {
                        // NextAuth not ready yet, try again in 500ms
                        setTimeout(setupNextAuthOverrides, 500)
                    }
                }

                // Start trying to set up overrides
                setTimeout(setupNextAuthOverrides, 1000)
            }

            console.log('Mobile auth override installed successfully')
        } else {
            console.log('Not a native platform - skipping mobile auth override')
        }
    }, [])

    return children
}