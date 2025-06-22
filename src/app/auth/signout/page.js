'use client';
import { useEffect } from 'react';

export default function SignOutPage() {
    useEffect(() => {
        const performSignOut = async () => {
            try {
                // Clear all storage
                localStorage.clear();
                sessionStorage.clear();

                // Clear all cookies for all domains
                const cookies = document.cookie.split(";");
                for (let cookie of cookies) {
                    const eqPos = cookie.indexOf("=");
                    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

                    // Clear for multiple domain variations
                    [
                        '',
                        'docbearscomfort.kitchen',
                        '.docbearscomfort.kitchen',
                        'www.docbearscomfort.kitchen'
                    ].forEach(domain => {
                        const domainStr = domain ? `;domain=${domain}` : '';
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${domainStr};`;
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${domainStr};secure;`;
                    });
                }

                // Wait a moment then redirect
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);

            } catch (error) {
                console.error('Custom signout error:', error);
                window.location.href = '/';
            }
        };

        performSignOut();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Signing Out...</h1>
                <p>Please wait while we sign you out securely.</p>
            </div>
        </div>
    );
}