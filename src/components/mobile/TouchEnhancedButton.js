'use client';
// file: /src/components/mobile/TouchEnhancedButton.js - Enhanced button component

import { MobileHaptics } from './MobileHaptics';

export function TouchEnhancedButton({
                                        children,
                                        onClick,
                                        haptic = 'light',
                                        className = '',
                                        disabled = false,
                                        ...props
                                    }) {
    const handleClick = (e) => {
        if (!disabled) {
            MobileHaptics[haptic]();
            onClick?.(e);
        }
    };

    return (
        <button
            {...props}
            onClick={handleClick}
            disabled={disabled}
            className={`
                touch-friendly transition-all duration-150 active:scale-95
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md active:shadow-sm'}
                ${className}
            `}
            style={{
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                minHeight: '44px',
                minWidth: '44px',
                ...props.style
            }}
        >
            {children}
        </button>
    );
}