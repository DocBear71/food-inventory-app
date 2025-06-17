'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export default function SessionProvider({ children }) {

    try {
        return (
            <NextAuthSessionProvider>
                {children}
            </NextAuthSessionProvider>
        );
    } catch (error) {
        console.error('SessionProvider error:', error);
        return <div>SessionProvider Error: {error.message}</div>;
    }
}