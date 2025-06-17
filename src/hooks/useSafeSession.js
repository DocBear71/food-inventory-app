'use client'

import { useSession } from 'next-auth/react';  // ← This import was missing!

export function useSafeSession() {
    try {
        const result = useSession();
        // Ensure we always return a consistent object structure
        return {
            data: result?.data || null,
            status: result?.status || 'loading',
            update: result?.update || (() => Promise.resolve(null)),
        };
    } catch (error) {
        // Return a mock session object when SessionProvider isn't available
        console.log('SessionProvider not available, using fallback');
        return {
            data: null,
            status: 'unauthenticated',
            update: () => Promise.resolve(null),
        };
    }
}