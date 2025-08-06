// Create this as /src/components/IOSRouterHandler.js
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Add this right after your imports in IOSRouterHandler.js
useEffect(() => {
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (!isCapacitor || !isIOS) return;

    // CRITICAL: Override Next.js router prefetch for iOS
    const originalPush = router.push;
    const originalReplace = router.replace;
    const originalPrefetch = router.prefetch;

    // Override prefetch to do nothing on iOS
    router.prefetch = () => Promise.resolve();

    // Override push to ensure it works on iOS
    router.push = (href, options) => {
        console.log('🍎 iOS Router Override: Pushing to:', href);
        return originalPush(href, { ...options, scroll: false });
    };

    // Override replace to ensure it works on iOS  
    router.replace = (href, options) => {
        console.log('🍎 iOS Router Override: Replacing to:', href);
        return originalReplace(href, { ...options, scroll: false });
    };

    return () => {
        // Restore original functions
        router.push = originalPush;
        router.replace = originalReplace;
        router.prefetch = originalPrefetch;
    };
}, [router]);

export default function IOSRouterHandler({ children }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Only run on iOS/Capacitor
        const isCapacitor = typeof window !== 'undefined' && window.Capacitor;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (!isCapacitor || !isIOS) return;

        console.log('🍎 iOS Router Handler active for:', pathname);

        // Handle iOS routing issues
        const handleIOSRouting = () => {
            // If we're trying to access a dynamic route that failed
            if (pathname.includes('index.txt')) {
                console.log('🚫 Detected index.txt error, redirecting...');
                
                // Extract the intended path
                const cleanPath = pathname.replace('/index.txt', '').replace('.txt', '');
                
                if (cleanPath !== pathname) {
                    console.log('🔄 Redirecting to:', cleanPath);
                    router.replace(cleanPath);
                }
            }
            
            // Handle recipe URLs specifically
            const recipeMatch = pathname.match(/^\/recipes\/([^\/]+)$/);
            if (recipeMatch && recipeMatch[1] && recipeMatch[1] !== 'add' && recipeMatch[1] !== 'import') {
                const recipeId = recipeMatch[1];
                console.log('🍎 iOS detected recipe route:', recipeId);
                
                // Ensure we're on the right route
                if (!pathname.includes('[id]')) {
                    console.log('🔄 Ensuring proper recipe route navigation');
                    // The route should work, but log for debugging
                }
            }
        };

        // Run immediately
        handleIOSRouting();

        // Also run on popstate (back/forward)
        const handlePopState = () => {
            setTimeout(handleIOSRouting, 100);
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [pathname, router]);

    // For iOS, intercept navigation clicks to handle routing properly
    useEffect(() => {
        const isCapacitor = typeof window !== 'undefined' && window.Capacitor;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (!isCapacitor || !isIOS) return;

        const handleClick = (event) => {
            const target = event.target.closest('a[href], [href]');
            if (!target) return;

            const href = target.getAttribute('href') || target.href;
            
            // Only handle internal links
            if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) {
                return;
            }

            // ENHANCED: Handle ALL dynamic routes
            const dynamicRoutes = [
                /^\/recipes\/[^\/]+$/,           // /recipes/[id]
                /^\/recipes\/[^\/]+\/edit$/,    // /recipes/[id]/edit
                /^\/collections\/[^\/]+$/,      // /collections/[id]
                /^\/admin\/users\/[^\/]+$/,     // /admin/users/[id]
            ];

            const isDynamicRoute = dynamicRoutes.some(pattern => pattern.test(href));

            if (isDynamicRoute) {
                console.log('🍎 iOS intercepting dynamic route:', href);
                event.preventDefault();
                event.stopPropagation();
                
                // Force client-side navigation
                router.push(href);
                return false;
            }
        };

        // Use capture phase to intercept early
        document.addEventListener('click', handleClick, true);
        
        return () => {
            document.removeEventListener('click', handleClick, true);
        };
    }, [router]);

    return children;
}