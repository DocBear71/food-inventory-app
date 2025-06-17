'use client';
// file: /src/components/mobile/QuickActionButton.js - Floating action button

import { TouchEnhancedButton } from './TouchEnhancedButton';

export function QuickActionButton({
                                      icon,
                                      onClick,
                                      position = 'bottom-right',
                                      color = 'indigo',
                                      size = 'md'
                                  }) {
    const positions = {
        'bottom-right': 'fixed bottom-20 right-4 z-20',
        'bottom-left': 'fixed bottom-20 left-4 z-20',
        'top-right': 'fixed top-20 right-4 z-20',
        'top-left': 'fixed top-20 left-4 z-20'
    };

    const colors = {
        indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
        green: 'bg-green-600 hover:bg-green-700 text-white shadow-green-200',
        red: 'bg-red-600 hover:bg-red-700 text-white shadow-red-200',
        blue: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
    };

    const sizes = {
        sm: 'w-12 h-12 text-sm',
        md: 'w-14 h-14 text-base',
        lg: 'w-16 h-16 text-lg'
    };

    return (
        <TouchEnhancedButton
            onClick={onClick}
            haptic="medium"
            className={`
                ${positions[position]}
                ${colors[color]}
                ${sizes[size]}
                rounded-full shadow-lg
                flex items-center justify-center
                transform transition-all duration-200
                hover:scale-105 active:scale-95
            `}
        >
            {typeof icon === 'string' ? (
                <span className="text-xl">{icon}</span>
            ) : (
                icon
            )}
        </TouchEnhancedButton>
    );
}
