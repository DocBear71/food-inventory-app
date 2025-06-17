'use client';
// file: /src/components/mobile/SwipeNavigation.js - Week navigation with swipe

import { TouchSwipeContainer } from './TouchGestures';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';

export function SwipeableWeekNavigation({
                                            currentWeek,
                                            onPreviousWeek,
                                            onNextWeek,
                                            children,
                                            className = ''
                                        }) {
    const formatWeekRange = (weekStart) => {
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        return `${start.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })} - ${end.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })}`;
    };

    return (
        <div className={className}>
            {/* Week navigation header */}
            <div className="flex items-center justify-between mb-4 bg-white rounded-lg p-4 shadow-sm">
                <TouchEnhancedButton
                    onClick={onPreviousWeek}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                    style={{ touchAction: 'manipulation' }}
                >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </TouchEnhancedButton>

                <div className="flex-1 text-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {formatWeekRange(currentWeek)}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        ← Swipe to navigate weeks →
                    </p>
                </div>

                <TouchEnhancedButton
                    onClick={onNextWeek}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                    style={{ touchAction: 'manipulation' }}
                >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </TouchEnhancedButton>
            </div>

            {/* Swipeable content */}
            <TouchSwipeContainer
                onSwipeLeft={onNextWeek}
                onSwipeRight={onPreviousWeek}
                className="overflow-hidden"
            >
                {children}
            </TouchSwipeContainer>
        </div>
    );
}
