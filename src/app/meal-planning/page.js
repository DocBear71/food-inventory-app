'use client';
// file: /src/app/meal-planning/page.js v1


import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import MealPlanningCalendar from '@/components/meal-planning/MealPlanningCalendar';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

export default function MealPlanningPage() {
    const { data: session, status } = useSafeSession();

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                        <div className="grid grid-cols-7 gap-4">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <div className="h-6 bg-gray-200 rounded"></div>
                                    {[...Array(4)].map((_, j) => (
                                        <div key={j} className="h-24 bg-gray-200 rounded"></div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    <Footer />
                </div>
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
            <div className="max-w-7xl mx-auto">
                <MealPlanningCalendar />
            </div>
        </MobileOptimizedLayout>
    );
}