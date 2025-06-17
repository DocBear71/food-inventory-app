'use client'

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function useSafeSession() {
    const [mobileSession, setMobileSession] = useState(null);

    try {
        const result = useSession();

        // If we're in a mobile app and the regular session fails,
        // check for stored mobile session
        if (Capacitor.isNativePlatform() && !result?.data) {
            // You could implement mobile-specific session storage here
            // For now, return a basic authenticated state if login was successful
            return {
                data: mobileSession,
                status: mobileSession ? 'authenticated' : 'unauthenticated',
                update: () => Promise.resolve(null),
            };
        }

        return {
            data: result?.data || null,
            status: result?.status || 'loading',
            update: result?.update || (() => Promise.resolve(null)),
        };
    } catch (error) {
        return {
            data: null,
            status: 'unauthenticated',
            update: () => Promise.resolve(null),
        };
    }
}