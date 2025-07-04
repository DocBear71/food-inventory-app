'use client'

// file: /src/components/providers/CapacitorAuthProvider.js - v6 - FIXED: URL concatenation bug

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function CapacitorAuthProvider({ children }) {
    useEffect(() => {
        console.log('CapacitorAuthProvider v6 started')

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
                        // FIXED: Proper URL handling
                        const newUrl = url.startsWith('/') ? `https://www.docbearscomfort.kitchen${url}` : url
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

                    // FIXED: Handle session requests specially for mobile
                    if (url.includes('/api/auth/session')) {
                        console.log('Session request detected - attempting production fetch with fallback')

                        // FIXED: Proper URL handling to avoid duplication
                        const newUrl = url.startsWith('/') ? `https://www.docbearscomfort.kitchen${url}` : url
                        console.log('Session redirect:', url, '→', newUrl)

                        return originalFetch(newUrl, {
                            ...options,
                            credentials: 'include'
                        }).then(async response => {
                            console.log('Session response status:', response.status)

                            if (response.ok) {
                                try {
                                    const data = await response.json()
                                    console.log('Session data received:', data)

                                    // FIXED: Only store if we have actual user data
                                    if (data?.user && Object.keys(data.user).length > 1) {
                                        console.log('📱 Storing complete session from auth provider...')
                                        try {
                                            const { MobileSession } = await import('@/lib/mobile-session-simple')
                                            await MobileSession.setSession(data)
                                            console.log('✅ Complete session stored in mobile storage from auth provider')
                                        } catch (error) {
                                            console.error('❌ Failed to store session in mobile storage:', error)
                                        }
                                    } else {
                                        console.log('⚠️ Session data incomplete, not storing:', data)
                                    }

                                    // Return the response with the data
                                    return new Response(JSON.stringify(data), {
                                        status: response.status,
                                        statusText: response.statusText,
                                        headers: response.headers
                                    })
                                } catch (error) {
                                    console.error('Error parsing session response:', error)
                                    return response
                                }
                            } else {
                                console.log('Session request failed, checking mobile storage...')

                                // ENHANCED: Fallback to mobile storage if server request fails
                                try {
                                    const { MobileSession } = await import('@/lib/mobile-session-simple')
                                    const mobileSession = await MobileSession.getSession()

                                    if (mobileSession) {
                                        console.log('✅ Found session in mobile storage, using as fallback')
                                        return new Response(JSON.stringify(mobileSession), {
                                            status: 200,
                                            headers: {
                                                'Content-Type': 'application/json'
                                            }
                                        })
                                    }
                                } catch (error) {
                                    console.error('Error checking mobile storage:', error)
                                }

                                return response
                            }
                        }).catch(async error => {
                            console.error('Session fetch error:', error)

                            // ENHANCED: Fallback to mobile storage on network error
                            try {
                                const { MobileSession } = await import('@/lib/mobile-session-simple')
                                const mobileSession = await MobileSession.getSession()

                                if (mobileSession) {
                                    console.log('✅ Network error - using mobile storage as fallback')
                                    return new Response(JSON.stringify(mobileSession), {
                                        status: 200,
                                        headers: {
                                            'Content-Type': 'application/json'
                                        }
                                    })
                                }
                            } catch (fallbackError) {
                                console.error('Fallback error:', fallbackError)
                            }

                            // If all else fails, return a proper error response
                            return new Response(JSON.stringify({}), {
                                status: 401,
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            })
                        })
                    }

                    // Handle provider requests
                    if (url.includes('/api/auth/providers')) {
                        // FIXED: Proper URL handling
                        const newUrl = url.startsWith('/') ? `https://www.docbearscomfort.kitchen${url}` : url
                        console.log('Auth redirect for:', url, '→', newUrl)
                        return originalFetch(newUrl, {
                            ...options,
                            credentials: 'include'
                        })
                    }

                    // For other auth requests, use current domain
                    console.log('Using current domain for auth request:', url)
                    return originalFetch(url, options)
                }

                return originalFetch(url, options)
            }

            console.log('Mobile auth override installed successfully')
        } else {
            console.log('Not a native platform - skipping mobile auth override')
        }
    }, [])

    return children
}