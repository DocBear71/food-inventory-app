// file: /src/components/mobile/TouchGestures.js - Touch gesture handler
'use client';

import { useState, useRef, useEffect } from 'react';

export function useTouchGestures(onSwipeLeft, onSwipeRight, threshold = 50) {
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    const minSwipeDistance = threshold;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && onSwipeLeft) {
            onSwipeLeft();
        }
        if (isRightSwipe && onSwipeRight) {
            onSwipeRight();
        }
    };

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd
    };
}

export function TouchSwipeContainer({ children, onSwipeLeft, onSwipeRight, className = '' }) {
    const gestures = useTouchGestures(onSwipeLeft, onSwipeRight);

    return (
        <div
            className={`touch-pan-x ${className}`}
            {...gestures}
            style={{ touchAction: 'pan-x' }}
        >
            {children}
        </div>
    );
}
