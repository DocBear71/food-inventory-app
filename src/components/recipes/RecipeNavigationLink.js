'use client';

// Create this as /src/components/recipes/RecipeNavigationLink.js

import { useRouter } from 'next/navigation';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function RecipeNavigationLink({ recipeId, children, className = "" }) {
    const router = useRouter();

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // ADDED: Stop all event propagation

        const targetUrl = `/recipes/${recipeId}`;
        console.log('🍎 RecipeNavigationLink: Navigating to:', targetUrl);

        // ENHANCED: Add delay to ensure iOS processes the click properly
        setTimeout(() => {
            console.log('🍎 RecipeNavigationLink: Executing delayed navigation to:', targetUrl);
            router.push(targetUrl);
        }, 50); // Small delay to let event handling complete
    };

    const handleTouchStart = (e) => {
        // Also handle touch events for iOS
        e.stopPropagation();
    };

    return (
        <TouchEnhancedButton
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            className={`w-full text-left ${className}`}
            // ADDED: Prevent any default link behavior
            role="button"
            tabIndex={0}
        >
            {children}
        </TouchEnhancedButton>
    );
}